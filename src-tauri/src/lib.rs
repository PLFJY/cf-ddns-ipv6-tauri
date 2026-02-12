mod cloudflare;
mod config;
mod models;
mod network;
mod platform;
mod secure_store;

use std::{
  net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream},
  path::PathBuf,
  process::Command,
  sync::{
    atomic::{AtomicBool, AtomicU16, Ordering},
    Arc,
  },
  time::Duration as StdDuration,
};

use axum::{
  extract::{Path, State},
  http::{header, StatusCode},
  response::{IntoResponse, Redirect, Response},
  routing::get,
  Json, Router,
};
use chrono::Utc;
use models::{
  AppConfig, AppSnapshot, InterfaceInfo, LocalHomepageRuntime, LookupRecordIdRequest,
  SaveSettingsRequest, ServiceModel, ServiceRuntimeModel, SyncStatus, SyncStatusKind, ThemeMode,
};
use parking_lot::Mutex;
use secure_store::SecureTokenStore;
use tauri::{
  menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
  async_runtime::JoinHandle,
  AppHandle, Emitter, Manager, RunEvent, Runtime, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tokio::sync::{Mutex as AsyncMutex, Notify};
use tokio::time::Duration;

const SNAPSHOT_EVENT: &str = "ddns://snapshot";
const NETWORK_CHANGED_EVENT: &str = "ddns://network-changed";
const AUTOSTART_ARG: &str = "--autostart";
const LOCAL_HOMEPAGE_FALLBACK_PORT: u16 = 8787;
const HOMEPAGE_FALLBACK_HTML: &str = r#"<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Local Host Homepage</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px"><h2>Local Host Homepage</h2><p>Homepage assets are not available yet.</p><p>Build frontend assets with <code>pnpm build</code> and restart the app.</p></body></html>"#;
const WINDOWS_FIREWALL_RULE_NAME: &str = "Cloudflare IPv6 DDNS Local Homepage";

#[derive(Clone)]
struct SharedState(Arc<AppState>);

struct AppState {
  config_path: std::path::PathBuf,
  config: Mutex<AppConfig>,
  interfaces: Mutex<Vec<InterfaceInfo>>,
  current_ipv6: Mutex<Option<String>>,
  linux_theme_hint: Option<ThemeMode>,
  token_store: SecureTokenStore,
  notify: Arc<Notify>,
  sync_lock: AsyncMutex<()>,
  _platform_watcher: Option<platform::PlatformWatcher>,
  shutting_down: Arc<AtomicBool>,
  lightweight_entry_task: AsyncMutex<Option<JoinHandle<()>>>,
  homepage_running: Arc<AtomicBool>,
  homepage_bound_port: Arc<AtomicU16>,
  homepage_dist_dir: PathBuf,
  app_icon_path: Option<PathBuf>,
}

impl AppState {
  fn snapshot(&self) -> AppSnapshot {
    let has_token = self.token_store.get_token().ok().flatten().is_some();
    let config = self.config.lock().clone();
    let configured_port = config.settings.local_homepage.web_port;
    let web_port = if self.homepage_running.load(Ordering::SeqCst) {
      self.homepage_bound_port.load(Ordering::SeqCst)
    } else {
      configured_port
    };
    let preferred_host = preferred_share_host(&config, self.current_ipv6.lock().clone());
    let service_statuses = build_service_runtime_models(&config.settings.local_homepage.services, &preferred_host);
    AppSnapshot {
      settings: config.settings,
      cache: config.cache,
      current_ipv6: self.current_ipv6.lock().clone(),
      interfaces: self.interfaces.lock().clone(),
      has_token,
      linux_theme_hint: self.linux_theme_hint,
      local_homepage: LocalHomepageRuntime {
        running: self.homepage_running.load(Ordering::SeqCst),
        web_port,
        web_url: format!("http://{}:{}/homepage.html", preferred_host, web_port),
        preferred_host,
        services: service_statuses,
      },
    }
  }
}

#[derive(Clone)]
struct LocalHomepageServerState {
  state: Arc<AppState>,
}

fn preferred_share_host(config: &AppConfig, current_ipv6: Option<String>) -> String {
  let domain = config.settings.cloudflare.domain.trim();
  if !domain.is_empty() {
    return domain.to_string();
  }
  if let Some(ipv4) = network::detect_outbound_source_ipv4() {
    return ipv4.to_string();
  }
  if let Some(ipv6) = current_ipv6 {
    return ipv6;
  }
  "127.0.0.1".to_string()
}

fn can_use_scheme(preset_type: &str) -> Option<&'static str> {
  match preset_type {
    "SMB" => Some("smb://"),
    "HTTP" => Some("http://"),
    "HTTPS" => Some("https://"),
    "FTP" => Some("ftp://"),
    "SSH" => Some("ssh://"),
    "RDP" => Some("rdp://"),
    _ => None,
  }
}

fn build_share_url(service: &ServiceModel, host: &str) -> String {
  if let Some(scheme) = can_use_scheme(service.preset_type.as_str()) {
    return format!("{scheme}{host}:{}", service.port);
  }
  format!("{host}:{}", service.port)
}

fn is_port_online(port: u16) -> bool {
  let ipv4 = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
  if TcpStream::connect_timeout(&ipv4, StdDuration::from_millis(250)).is_ok() {
    return true;
  }
  let ipv6 = SocketAddr::new(IpAddr::V6(std::net::Ipv6Addr::LOCALHOST), port);
  TcpStream::connect_timeout(&ipv6, StdDuration::from_millis(250)).is_ok()
}

fn build_service_runtime_models(services: &[ServiceModel], preferred_host: &str) -> Vec<ServiceRuntimeModel> {
  services
    .iter()
    .map(|service| ServiceRuntimeModel {
      id: service.id.clone(),
      name: service.name.clone(),
      port: service.port,
      icon: service.icon.clone(),
      description: service.description.clone(),
      preset_type: service.preset_type.clone(),
      is_online: is_port_online(service.port),
      share_url: build_share_url(service, preferred_host),
    })
    .collect()
}

#[tauri::command]
fn get_snapshot(state: tauri::State<'_, SharedState>) -> AppSnapshot {
  state.inner().0.snapshot()
}

#[tauri::command]
async fn save_settings(
  app: AppHandle,
  state: tauri::State<'_, SharedState>,
  request: SaveSettingsRequest,
) -> Result<AppSnapshot, String> {
  if request.clear_token {
    state
      .inner()
      .0
      .token_store
      .clear_token()
      .map_err(|error| format!("failed to clear API token: {error}"))?;
  }
  if let Some(token) = request.api_token.as_ref() {
    if !token.is_empty() {
      state
        .inner()
        .0
        .token_store
        .set_token(token)
        .map_err(|error| format!("failed to save API token securely: {error}"))?;
    }
  }

  {
    let mut config = request_to_config(request);
    {
      let current = state.inner().0.config.lock().clone();
      // Cloudflare lookup uses domain+zone. If domain changed, old record id is stale.
      if !current
        .settings
        .cloudflare
        .domain
        .trim()
        .eq_ignore_ascii_case(config.settings.cloudflare.domain.trim())
      {
        config.settings.cloudflare.record_id.clear();
      }
      config.cache = current.cache;
    }
    config::normalize(&mut config);
    config::save_config(&state.inner().0.config_path, &config)
      .map_err(|error| format!("failed to persist settings: {error}"))?;
    *state.inner().0.config.lock() = config;
  }

  apply_autostart(&app, state.inner().0.config.lock().settings.launch_on_startup)?;

  state.inner().0.notify.notify_one();
  refresh_tray_menu(&app, &state.inner().0);
  emit_snapshot(&app, &state.inner().0);
  Ok(state.inner().0.snapshot())
}

#[tauri::command]
async fn manual_push_now(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<AppSnapshot, String> {
  run_manual_push(&app, &state.inner().0).await?;
  Ok(state.inner().0.snapshot())
}

#[tauri::command]
async fn lookup_record_id(
  app: AppHandle,
  state: tauri::State<'_, SharedState>,
  request: LookupRecordIdRequest,
) -> Result<AppSnapshot, String> {
  let token = state
    .inner()
    .0
    .token_store
    .get_token()
    .map_err(|error| format!("failed reading secure API token: {error}"))?
    .ok_or_else(|| "API token is not set".to_string())?;

  let zone_id = request.zone_id.trim().to_string();
  let domain = request.domain.trim().to_string();

  if zone_id.is_empty() || domain.is_empty() {
    return Err("Zone ID and domain are required to lookup AAAA record".to_string());
  }

  let record_id = cloudflare::find_aaaa_record_id(&zone_id, &domain, &token)
    .await
    .map_err(|error| error.to_string())?;

  {
    let mut config = state.inner().0.config.lock();
    config.settings.cloudflare.zone_id = zone_id;
    config.settings.cloudflare.domain = domain;
    config.settings.cloudflare.record_id = record_id;
    config::save_config(&state.inner().0.config_path, &config)
      .map_err(|error| format!("failed to persist looked-up record id: {error}"))?;
  }

  refresh_tray_menu(&app, &state.inner().0);
  emit_snapshot(&app, &state.inner().0);
  Ok(state.inner().0.snapshot())
}

#[tauri::command]
fn enter_lightweight_mode(app: AppHandle, state: tauri::State<'_, SharedState>) -> Result<AppSnapshot, String> {
  {
    let mut config = state.inner().0.config.lock();
    config.settings.lightweight_mode = true;
    config::save_config(&state.inner().0.config_path, &config)
      .map_err(|error| format!("failed to persist lightweight mode: {error}"))?;
  }
  destroy_main_window(&app);
  refresh_tray_menu(&app, &state.inner().0);
  emit_snapshot(&app, &state.inner().0);
  Ok(state.inner().0.snapshot())
}

fn request_to_config(request: SaveSettingsRequest) -> AppConfig {
  AppConfig {
    settings: request.settings,
    cache: Default::default(),
  }
}

async fn run_manual_push(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
  let (interfaces, current_ipv6) = {
    let selected = state.config.lock().settings.selected_interface.clone();
    network::collect_interfaces_and_ipv6(selected.as_deref())
  };
  *state.interfaces.lock() = interfaces;
  *state.current_ipv6.lock() = current_ipv6.clone();

  let Some(ipv6) = current_ipv6 else {
    let message = "no eligible global IPv6 address is currently available";
    update_sync_status(app, state, SyncStatusKind::Error, Some(message.to_string()));
    return Err(message.to_string());
  };

  push_ipv6_to_cloudflare(app, state, ipv6).await
}

fn spawn_ip_change_worker(app: AppHandle, state: SharedState) {
  let app_for_tick = app.clone();
  let state_for_tick = state.clone();
  platform::spawn_background_worker(
    state.0.notify.clone(),
    state.0.shutting_down.clone(),
    move || {
      let app = app_for_tick.clone();
      let state = state_for_tick.clone();
      async move {
        let _ = run_detection_cycle(&app, &state.0).await;
      }
    },
  );
}

async fn run_detection_cycle(app: &AppHandle, state: &Arc<AppState>) -> Result<(), String> {
  let (selected_interface, auto_push_enabled) = {
    let config = state.config.lock();
    (config.settings.selected_interface.clone(), config.settings.auto_push)
  };

  let (interfaces, current_ipv6) = network::collect_interfaces_and_ipv6(selected_interface.as_deref());
  let network_changed = {
    let previous_interfaces = state.interfaces.lock().clone();
    let previous_ipv6 = state.current_ipv6.lock().clone();
    previous_interfaces != interfaces || previous_ipv6 != current_ipv6
  };
  *state.interfaces.lock() = interfaces;
  *state.current_ipv6.lock() = current_ipv6.clone();

  let mut changed = false;
  {
    let mut config = state.config.lock();
    // Requirement-driven behavior: we only compare local interface detection against local cache.
    // We intentionally do not poll Cloudflare for current AAAA content in the scheduler.
    if config.cache.last_known_ipv6 != current_ipv6 {
      config.cache.last_known_ipv6 = current_ipv6.clone();
      config.cache.last_ipv6_change_time = Some(Utc::now().to_rfc3339());
      changed = true;
      config::save_config(&state.config_path, &config)
        .map_err(|error| format!("failed to update IPv6 cache in config: {error}"))?;
    }
  }

  if changed && auto_push_enabled {
    if let Some(ipv6) = current_ipv6 {
      let _ = push_ipv6_to_cloudflare(app, state, ipv6).await;
    }
  }

  refresh_tray_menu(app, state);
  emit_snapshot(app, state);
  if network_changed {
    emit_network_changed(app);
  }
  Ok(())
}

async fn push_ipv6_to_cloudflare(app: &AppHandle, state: &Arc<AppState>, ipv6: String) -> Result<(), String> {
  let _guard = state.sync_lock.lock().await;

  let (zone_id, domain, mut record_id, ttl) = {
    let config = state.config.lock();
    (
      config.settings.cloudflare.zone_id.trim().to_string(),
      config.settings.cloudflare.domain.trim().to_string(),
      config.settings.cloudflare.record_id.trim().to_string(),
      config.settings.cloudflare.ttl,
    )
  };

  if zone_id.is_empty() || domain.is_empty() {
    let message = "Cloudflare zone id and domain must be set before pushing updates";
    update_sync_status(app, state, SyncStatusKind::Error, Some(message.to_string()));
    return Err(message.to_string());
  }

  let token = state
    .token_store
    .get_token()
    .map_err(|error| format!("failed reading secure API token: {error}"))?
    .ok_or_else(|| "API token is not set".to_string())?;

  if record_id.is_empty() {
    record_id = cloudflare::find_aaaa_record_id(&zone_id, &domain, &token)
      .await
      .map_err(|error| error.to_string())?;
    {
      let mut config = state.config.lock();
      config.settings.cloudflare.record_id = record_id.clone();
      let _ = config::save_config(&state.config_path, &config);
    }
  }

  let result = cloudflare::update_aaaa_record(&zone_id, &record_id, &token, &ipv6, ttl).await;
  match result {
    Ok(()) => {
      update_sync_status(
        app,
        state,
        SyncStatusKind::Success,
        Some(format!("Updated Cloudflare AAAA record to {}", ipv6)),
      );
      Ok(())
    }
    Err(error) => {
      update_sync_status(app, state, SyncStatusKind::Error, Some(error.to_string()));
      Err(error.to_string())
    }
  }
}

fn update_sync_status(app: &AppHandle, state: &Arc<AppState>, kind: SyncStatusKind, message: Option<String>) {
  {
    let mut config = state.config.lock();
    config.cache.last_sync_time = Some(Utc::now().to_rfc3339());
    config.cache.last_sync_status = SyncStatus { kind, message };
    let _ = config::save_config(&state.config_path, &config);
  }
  refresh_tray_menu(app, state);
  emit_snapshot(app, state);
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>, state: &Arc<AppState>) -> tauri::Result<tauri::menu::Menu<R>> {
  let config = state.config.lock().clone();
  let last_sync = config
    .cache
    .last_sync_time
    .unwrap_or_else(|| "never".to_string());

  let show_item = MenuItemBuilder::with_id("tray_show_main", "Show main window").build(app)?;
  let last_item = MenuItemBuilder::with_id("tray_last_sync", format!("Last update: {last_sync}"))
    .enabled(false)
    .build(app)?;
  let auto_item = CheckMenuItemBuilder::with_id("tray_auto_update", "Auto update enabled")
    .checked(config.settings.auto_push)
    .build(app)?;
  let manual_item = MenuItemBuilder::with_id("tray_manual_update", "Manual update").build(app)?;
  let separator = PredefinedMenuItem::separator(app)?;
  let quit_item = MenuItemBuilder::with_id("tray_quit", "Quit").build(app)?;

  MenuBuilder::new(app)
    .item(&show_item)
    .item(&last_item)
    .item(&separator)
    .item(&auto_item)
    .item(&manual_item)
    .item(&separator)
    .item(&quit_item)
    .build()
}

fn refresh_tray_menu(app: &AppHandle, state: &Arc<AppState>) {
  if let Some(tray) = app.tray_by_id("main-tray") {
    if let Ok(menu) = build_tray_menu(app, state) {
      let _ = tray.set_menu(Some(menu));
    }
  }
}

fn show_main_window(app: &AppHandle) {
  if let Some(window) = ensure_main_window(app) {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

fn persist_lightweight_mode(state: &Arc<AppState>, enabled: bool) {
  let mut config = state.config.lock();
  if config.settings.lightweight_mode == enabled {
    return;
  }
  config.settings.lightweight_mode = enabled;
  let _ = config::save_config(&state.config_path, &config);
}

fn activate_main_window(app: &AppHandle, state: &Arc<AppState>) {
  show_main_window(app);
  persist_lightweight_mode(state, false);
  let state_for_cancel = state.clone();
  tauri::async_runtime::spawn(async move {
    if let Some(task) = state_for_cancel.lightweight_entry_task.lock().await.take() {
      task.abort();
    }
  });
  refresh_tray_menu(app, state);
  emit_snapshot(app, state);
}

fn graceful_quit(app: &AppHandle, state: &Arc<AppState>) {
  state.shutting_down.store(true, Ordering::SeqCst);
  if let Ok(mut task_guard) = state.lightweight_entry_task.try_lock() {
    if let Some(task) = task_guard.take() {
      task.abort();
    }
  }
  // Prefer a normal close sequence on quit; avoid force-destroy teardown when exiting process.
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.close();
  }
  app.exit(0);
}

fn destroy_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    // Tauri webview docs: `destroy` force-closes the window and does not emit close events.
    let _ = window.destroy();
  }
}

fn ensure_main_window(app: &AppHandle) -> Option<tauri::WebviewWindow> {
  if let Some(window) = app.get_webview_window("main") {
    return Some(window);
  }

  // Tauri webview docs: `WebviewWindowBuilder::from_config` recreates windows from tauri.conf config.
  let config = app
    .config()
    .app
    .windows
    .iter()
    .find(|window| window.label == "main")
    .cloned()?;
  WebviewWindowBuilder::from_config(app, &config)
    .ok()?
    .build()
    .ok()
}

fn emit_snapshot(app: &AppHandle, state: &Arc<AppState>) {
  let _ = app.emit(SNAPSHOT_EVENT, state.snapshot());
}

fn emit_network_changed(app: &AppHandle) {
  let _ = app.emit(NETWORK_CHANGED_EVENT, ());
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct HomepageApiSnapshot {
  push_domain: Option<String>,
  preferred_host: String,
  web_port: u16,
  web_url: String,
  services: Vec<ServiceRuntimeModel>,
}

// Axum docs ("Routing" and "Handlers"): map root path to an HTTP redirect target.
async fn homepage_redirect() -> Redirect {
  Redirect::temporary("/homepage.html")
}

// Axum docs ("extract::State"): shared server state is injected into handlers.
async fn homepage_api_snapshot(State(server): State<LocalHomepageServerState>) -> Json<HomepageApiSnapshot> {
  let config = server.state.config.lock().clone();
  let preferred_host = preferred_share_host(&config, server.state.current_ipv6.lock().clone());
  let services = build_service_runtime_models(&config.settings.local_homepage.services, &preferred_host);
  let web_port = if server.state.homepage_running.load(Ordering::SeqCst) {
    server.state.homepage_bound_port.load(Ordering::SeqCst)
  } else {
    config.settings.local_homepage.web_port
  };
  let push_domain = {
    let value = config.settings.cloudflare.domain.trim();
    if value.is_empty() {
      None
    } else {
      Some(value.to_string())
    }
  };

  Json(HomepageApiSnapshot {
    push_domain,
    preferred_host: preferred_host.clone(),
    web_port,
    web_url: format!("http://{}:{}/homepage.html", preferred_host, web_port),
    services,
  })
}

async fn homepage_html(State(server): State<LocalHomepageServerState>) -> Response {
  serve_dist_file(&server.state.homepage_dist_dir, "homepage.html").await
}

// Axum docs ("Path extraction"): wildcard paths are supported via `{*path}` in route patterns.
async fn homepage_assets(Path(path): Path<String>, State(server): State<LocalHomepageServerState>) -> Response {
  let relative = format!("assets/{}", path.trim_start_matches('/'));
  serve_dist_file(&server.state.homepage_dist_dir, &relative).await
}

async fn homepage_favicon(State(server): State<LocalHomepageServerState>) -> Response {
  // Prefer serving the actual app icon so browser tab icon stays aligned with desktop icon.
  if let Some(path) = server.state.app_icon_path.as_ref() {
    return serve_any_file(path).await;
  }
  serve_dist_file(&server.state.homepage_dist_dir, "favicon.ico").await
}

async fn serve_dist_file(dist_dir: &PathBuf, relative: &str) -> Response {
  let safe_relative = relative.trim_start_matches('/').replace('\\', "/");
  let target = dist_dir.join(&safe_relative);
  let canonical = match tokio::fs::canonicalize(&target).await {
    Ok(path) => path,
    Err(_) => {
      if safe_relative == "homepage.html" {
        return (
          StatusCode::OK,
          [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
          HOMEPAGE_FALLBACK_HTML,
        )
          .into_response();
      }
      return (StatusCode::NOT_FOUND, "Not found").into_response();
    }
  };
  let canonical_dist = match tokio::fs::canonicalize(dist_dir).await {
    Ok(path) => path,
    Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Homepage dist path unavailable").into_response(),
  };
  if !canonical.starts_with(&canonical_dist) {
    return (StatusCode::FORBIDDEN, "Forbidden").into_response();
  }
  let bytes = match tokio::fs::read(&canonical).await {
    Ok(data) => data,
    Err(_) => return (StatusCode::NOT_FOUND, "Not found").into_response(),
  };
  let mime = mime_guess::from_path(&canonical).first_or_octet_stream();
  (
    [(header::CONTENT_TYPE, mime.as_ref())],
    bytes,
  )
    .into_response()
}

fn resolve_homepage_dist_dir(app: &AppHandle) -> PathBuf {
  if let Ok(override_path) = std::env::var("CF_DDNS_HOMEPAGE_DIST") {
    let path = PathBuf::from(override_path);
    if path.exists() {
      return path;
    }
  }

  let workspace_dist = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("..")
    .join("dist");
  if workspace_dist.exists() {
    return workspace_dist;
  }

  // Tauri Rust docs: `PathResolver::resource_dir` resolves bundled resources directory.
  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled_dist = resource_dir.join("dist");
    if bundled_dist.exists() {
      return bundled_dist;
    }
  }

  workspace_dist
}

fn resolve_app_icon_path(app: &AppHandle) -> Option<PathBuf> {
  let dev_icon_ico = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("icons").join("icon.ico");
  if dev_icon_ico.exists() {
    return Some(dev_icon_ico);
  }
  let dev_icon_png = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("icons").join("icon.png");
  if dev_icon_png.exists() {
    return Some(dev_icon_png);
  }

  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundle_ico = resource_dir.join("icons").join("icon.ico");
    if bundle_ico.exists() {
      return Some(bundle_ico);
    }
    let bundle_png = resource_dir.join("icons").join("icon.png");
    if bundle_png.exists() {
      return Some(bundle_png);
    }
  }
  None
}

async fn serve_any_file(path: &PathBuf) -> Response {
  let bytes = match tokio::fs::read(path).await {
    Ok(data) => data,
    Err(_) => return (StatusCode::NOT_FOUND, "Not found").into_response(),
  };
  let mime = mime_guess::from_path(path).first_or_octet_stream();
  (
    [(header::CONTENT_TYPE, mime.as_ref())],
    bytes,
  )
    .into_response()
}

fn spawn_local_homepage_server(app: AppHandle, state: SharedState) {
  let state_for_server = state.clone();
  tauri::async_runtime::spawn(async move {
    let configured_port = {
      let config = state_for_server.0.config.lock();
      let configured = config.settings.local_homepage.web_port;
      if configured == 0 {
        8080
      } else {
        configured
      }
    };

    let primary_address = SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), configured_port);
    let (listener, bound_port) = match tokio::net::TcpListener::bind(primary_address).await {
      Ok(listener) => (listener, configured_port),
      Err(primary_error) => {
        // Prefer port 80 for bare-host access. If unavailable, fallback to a high port.
        if configured_port != LOCAL_HOMEPAGE_FALLBACK_PORT {
          let fallback_address = SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), LOCAL_HOMEPAGE_FALLBACK_PORT);
          match tokio::net::TcpListener::bind(fallback_address).await {
            Ok(listener) => (listener, LOCAL_HOMEPAGE_FALLBACK_PORT),
            Err(fallback_error) => {
              state_for_server.0.homepage_running.store(false, Ordering::SeqCst);
              state_for_server.0.homepage_bound_port.store(0, Ordering::SeqCst);
              eprintln!(
                "local homepage server failed to bind on {} ({}) and fallback {} ({})",
                primary_address,
                primary_error,
                fallback_address,
                fallback_error
              );
              emit_snapshot(&app, &state_for_server.0);
              return;
            }
          }
        } else {
          state_for_server.0.homepage_running.store(false, Ordering::SeqCst);
          state_for_server.0.homepage_bound_port.store(0, Ordering::SeqCst);
          eprintln!("local homepage server failed to bind on {primary_address}: {primary_error}");
          emit_snapshot(&app, &state_for_server.0);
          return;
        }
      }
    };

    if let Err(error) = ensure_firewall_inbound_rule(bound_port).await {
      eprintln!("failed to configure firewall inbound rule: {error}");
    }

    state_for_server.0.homepage_running.store(true, Ordering::SeqCst);
    state_for_server.0.homepage_bound_port.store(bound_port, Ordering::SeqCst);
    emit_snapshot(&app, &state_for_server.0);

    let router = Router::new()
      .route("/", get(homepage_redirect))
      .route("/homepage.html", get(homepage_html))
      .route("/favicon.ico", get(homepage_favicon))
      .route("/assets/{*path}", get(homepage_assets))
      .route("/api/homepage/snapshot", get(homepage_api_snapshot))
      .with_state(LocalHomepageServerState {
        state: state_for_server.0.clone(),
      });

    // Axum server docs: one `serve` call binds one listener. To support IPv4 + IPv6
    // access simultaneously, we run one server per bound listener.
    let mut server_tasks = Vec::new();
    {
      let shutting_down = state_for_server.0.shutting_down.clone();
      let router_v4 = router.clone();
      server_tasks.push(tauri::async_runtime::spawn(async move {
        let _ = axum::serve(listener, router_v4)
          .with_graceful_shutdown(wait_for_shutdown(shutting_down))
          .await;
      }));
    }

    let ipv6_address = SocketAddr::new(IpAddr::V6(std::net::Ipv6Addr::UNSPECIFIED), bound_port);
    match tokio::net::TcpListener::bind(ipv6_address).await {
      Ok(listener_v6) => {
        let shutting_down = state_for_server.0.shutting_down.clone();
        let router_v6 = router.clone();
        server_tasks.push(tauri::async_runtime::spawn(async move {
          let _ = axum::serve(listener_v6, router_v6)
            .with_graceful_shutdown(wait_for_shutdown(shutting_down))
            .await;
        }));
      }
      Err(error) => {
        eprintln!("local homepage ipv6 listener bind failed on {ipv6_address}: {error}");
      }
    }

    for task in server_tasks {
      let _ = task.await;
    }

    state_for_server.0.homepage_running.store(false, Ordering::SeqCst);
    state_for_server.0.homepage_bound_port.store(0, Ordering::SeqCst);
    emit_snapshot(&app, &state_for_server.0);
  });
}

async fn wait_for_shutdown(shutting_down: Arc<AtomicBool>) {
  while !shutting_down.load(Ordering::SeqCst) {
    tokio::time::sleep(Duration::from_millis(200)).await;
  }
}

#[cfg(target_os = "windows")]
async fn ensure_firewall_inbound_rule(port: u16) -> Result<(), String> {
  fn local_port_matches(candidate: &str, target: u16) -> bool {
    let value = candidate.trim().to_ascii_lowercase();
    if value.is_empty() {
      return false;
    }
    if value == "any" {
      return true;
    }
    for part in value.split(',') {
      let token = part.trim();
      if token.is_empty() {
        continue;
      }
      if let Some((start, end)) = token.split_once('-') {
        let Ok(start_port) = start.trim().parse::<u16>() else {
          continue;
        };
        let Ok(end_port) = end.trim().parse::<u16>() else {
          continue;
        };
        if start_port <= target && target <= end_port {
          return true;
        }
        continue;
      }
      if let Ok(single_port) = token.parse::<u16>() {
        if single_port == target {
          return true;
        }
      }
    }
    false
  }

  // Query existing rule ports first; only elevate when update is required.
  tokio::task::spawn_blocking(move || {
    let query_script = format!(
      "$ports = Get-NetFirewallRule -DisplayName '{}' -ErrorAction SilentlyContinue | Get-NetFirewallPortFilter | Where-Object {{ $_.Protocol -eq 'TCP' -or $_.Protocol -eq 6 }} | Select-Object -ExpandProperty LocalPort; if ($null -eq $ports) {{ exit 3 }}; $ports | ForEach-Object {{ $_ }}",
      WINDOWS_FIREWALL_RULE_NAME.replace('\'', "''")
    );
    let query_output = Command::new("powershell")
      .args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &query_script,
      ])
      .output()
      .map_err(|error| format!("failed to query existing firewall rule ports: {error}"))?;

    let needs_update = if query_output.status.success() {
      let stdout = String::from_utf8_lossy(&query_output.stdout);
      !stdout.lines().any(|line| local_port_matches(line, port))
    } else {
      // Exit code 3 means no matching rule exists.
      query_output.status.code() != Some(3)
    };

    if !needs_update {
      return Ok(());
    }

    let delete_args = format!(
      "advfirewall firewall delete rule name=\"{}\"",
      WINDOWS_FIREWALL_RULE_NAME
    );
    let add_args = format!(
      "advfirewall firewall add rule name=\"{}\" dir=in action=allow protocol=TCP localport={} profile=any",
      WINDOWS_FIREWALL_RULE_NAME, port
    );
    let ps_script = format!(
      "$d = Start-Process -FilePath 'netsh.exe' -ArgumentList '{}' -Verb RunAs -Wait -PassThru; $a = Start-Process -FilePath 'netsh.exe' -ArgumentList '{}' -Verb RunAs -Wait -PassThru; exit $a.ExitCode",
      delete_args.replace('\'', "''"),
      add_args.replace('\'', "''")
    );
    let output = Command::new("powershell")
      .args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &ps_script,
      ])
      .output()
      .map_err(|error| format!("failed to run elevated firewall update script: {error}"))?;

    if output.status.success() {
      return Ok(());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let merged = format!("{stdout} {stderr}").to_lowercase();
    if merged.contains("canceled by the user") || merged.contains("cancelled by the user") {
      return Err("firewall rule update was cancelled in UAC prompt".to_string());
    }
    Err(format!(
      "elevated firewall update script exited with {}. stdout: {} stderr: {}",
      output.status,
      stdout,
      stderr
    ))
  })
  .await
  .map_err(|error| format!("firewall worker task failed: {error}"))?
}

#[cfg(not(target_os = "windows"))]
async fn ensure_firewall_inbound_rule(_port: u16) -> Result<(), String> {
  Ok(())
}

fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
  // Official plugin docs: tauri-plugin-autostart "Usage" uses ManagerExt::autolaunch()
  // with `enable`, `disable`, and `is_enabled`.
  let launcher = app.autolaunch();
  if enabled {
    launcher
      .enable()
      .map_err(|error| format!("failed enabling autostart: {error}"))?;
  } else {
    // Some platforms return "file not found" when disabling an entry that was never created.
    // We first check current state and only call `disable` when it is currently enabled.
    let already_enabled = launcher
      .is_enabled()
      .map_err(|error| format!("failed reading autostart state: {error}"))?;
    if already_enabled {
      if let Err(error) = launcher.disable() {
        let text = error.to_string();
        // Windows may surface os error 2 for missing startup artifacts; treat as already disabled.
        if !(text.contains("os error 2") || text.contains("cannot find the file")) {
          return Err(format!("failed disabling autostart: {error}"));
        }
      }
    }
  }
  Ok(())
}

pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(state) = app.try_state::<SharedState>() {
        activate_main_window(app, &state.inner().0);
      } else {
        show_main_window(app);
      }
    }))
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      Some(vec![AUTOSTART_ARG]),
    ))
    .setup(|app| {
      let (mut loaded_config, config_path) =
        config::load_or_default(app.handle()).map_err(|error| anyhow::anyhow!("{error}"))?;

      let _ = apply_autostart(app.handle(), loaded_config.settings.launch_on_startup);
      if let Ok(enabled) = app.autolaunch().is_enabled() {
        loaded_config.settings.launch_on_startup = enabled;
      }
      // Product behavior: app always boots in lightweight mode.
      loaded_config.settings.lightweight_mode = true;
      let _ = config::save_config(&config_path, &loaded_config);

      let (interfaces, current_ipv6) =
        network::collect_interfaces_and_ipv6(loaded_config.settings.selected_interface.as_deref());
      let notify = Arc::new(Notify::new());
      let platform_watcher = platform::start_network_watcher(notify.clone()).map_err(anyhow::Error::msg)?;
      let shutting_down = Arc::new(AtomicBool::new(false));
      let homepage_running = Arc::new(AtomicBool::new(false));
      let homepage_bound_port = Arc::new(AtomicU16::new(0));
      let homepage_dist_dir = resolve_homepage_dist_dir(app.handle());
      let app_icon_path = resolve_app_icon_path(app.handle());

      let state = SharedState(Arc::new(AppState {
        config_path,
        config: Mutex::new(loaded_config.clone()),
        interfaces: Mutex::new(interfaces),
        current_ipv6: Mutex::new(current_ipv6),
        linux_theme_hint: platform::detect_theme_hint(),
        token_store: SecureTokenStore::new("dev.plfjy.cloudflare-ipv6-ddns"),
        notify,
        sync_lock: AsyncMutex::new(()),
        _platform_watcher: platform_watcher,
        shutting_down: shutting_down.clone(),
        lightweight_entry_task: AsyncMutex::new(None),
        homepage_running,
        homepage_bound_port,
        homepage_dist_dir,
        app_icon_path,
      }));
      app.manage(state.clone());

      let tray_menu = build_tray_menu(app.handle(), &state.0).map_err(|error| anyhow::anyhow!("{error}"))?;
      let tray_state = state.clone();
      platform::install_tray(
        app.handle(),
        tray_menu,
        platform::TrayHandlers {
          on_show_main: Arc::new({
            let state = state.clone();
            move |app| activate_main_window(app, &state.0)
          }),
          on_manual_update: Arc::new(move |app| {
            let app = app.clone();
            let state = tray_state.clone();
            tauri::async_runtime::spawn(async move {
              let _ = run_manual_push(&app, &state.0).await;
            });
          }),
          on_toggle_auto_update: Arc::new({
            let tray_state = state.clone();
            move |app| {
              let mut config = tray_state.0.config.lock();
              config.settings.auto_push = !config.settings.auto_push;
              let _ = config::save_config(&tray_state.0.config_path, &config);
              drop(config);
              tray_state.0.notify.notify_one();
              refresh_tray_menu(app, &tray_state.0);
              emit_snapshot(app, &tray_state.0);
            }
          }),
          on_quit: Arc::new({
            let state = state.clone();
            move |app| {
              graceful_quit(app, &state.0);
            }
          }),
        },
      )
      .map_err(anyhow::Error::msg)?;

      let _ = std::env::args().any(|arg| arg == AUTOSTART_ARG);
      // Product behavior: startup should be lightweight and not flash a foreground window.
      // Keep the preconfigured hidden window instead of force-destroying it at startup,
      // which makes Windows WebView2 shutdown sequence more stable on dev quit.
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
      }

      emit_snapshot(app.handle(), &state.0);
      spawn_local_homepage_server(app.handle().clone(), state.clone());
      spawn_ip_change_worker(app.handle().clone(), state);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_snapshot,
      save_settings,
      manual_push_now,
      lookup_record_id,
      enter_lightweight_mode
    ])
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        let state = app.state::<SharedState>();
        if state.inner().0.shutting_down.load(Ordering::SeqCst) {
          return;
        }
        // Enter lightweight mode immediately when users close the main window.
        api.prevent_close();
        persist_lightweight_mode(&state.inner().0, true);
        destroy_main_window(&app);
        refresh_tray_menu(&app, &state.inner().0);
        emit_snapshot(&app, &state.inner().0);
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    if let RunEvent::ExitRequested { api, .. } = event {
      let state = app_handle.state::<SharedState>();
      if !state.inner().0.shutting_down.load(Ordering::SeqCst) {
        // Keep backend scheduler + tray alive even when all windows are destroyed in lightweight mode.
        api.prevent_exit();
      }
    }
  });
}
