use std::sync::Arc;

use futures_util::StreamExt;
use rtnetlink::new_connection;
use tauri::{
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager,
};
use tokio::sync::Notify;

use crate::models::ThemeMode;

use super::TrayHandlers;

pub struct PlatformWatcher {
  _notify: Arc<Notify>,
}

pub fn detect_theme_hint() -> Option<ThemeMode> {
  if let Ok(theme) = std::env::var("GTK_THEME") {
    let lower = theme.to_lowercase();
    if lower.contains("dark") {
      return Some(ThemeMode::Dark);
    }
    if !lower.is_empty() {
      return Some(ThemeMode::Light);
    }
  }
  None
}

pub fn start_network_watcher(notify: Arc<Notify>) -> Result<Option<PlatformWatcher>, String> {
  let (connection, _handle, mut messages) =
    new_connection().map_err(|error| format!("failed to open rtnetlink connection: {error}"))?;
  tauri::async_runtime::spawn(connection);

  let notify_for_task = notify.clone();
  tauri::async_runtime::spawn(async move {
    while messages.next().await.is_some() {
      notify_for_task.notify_one();
    }
  });

  Ok(Some(PlatformWatcher { _notify: notify }))
}

pub fn install_tray(
  app: &AppHandle,
  menu: tauri::menu::Menu<tauri::Wry>,
  handlers: TrayHandlers,
) -> Result<(), String> {
  let on_show_main_for_menu = handlers.on_show_main.clone();
  let on_manual_update = handlers.on_manual_update.clone();
  let on_toggle_auto_update = handlers.on_toggle_auto_update.clone();
  let on_quit = handlers.on_quit.clone();
  let on_show_main_for_click = handlers.on_show_main.clone();

  let mut tray_builder = TrayIconBuilder::with_id("main-tray")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .tooltip("Cloudflare IPv6 DDNS");
  if let Some(icon) = app.default_window_icon().cloned() {
    tray_builder = tray_builder.icon(icon);
  }

  tray_builder
    .on_menu_event(move |app, event| match event.id.as_ref() {
      "tray_show_main" => (on_show_main_for_menu)(app),
      "tray_manual_update" => (on_manual_update)(app),
      "tray_auto_update" => (on_toggle_auto_update)(app),
      "tray_quit" => (on_quit)(app),
      _ => {}
    })
    .on_tray_icon_event(move |tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        (on_show_main_for_click)(&tray.app_handle());
      }
    })
    .build(app)
    .map_err(|error| error.to_string())?;
  Ok(())
}
