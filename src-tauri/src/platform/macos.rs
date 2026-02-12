use std::sync::Arc;

use system_configuration::dynamic_store::{SCDynamicStore, SCDynamicStoreBuilder};
use tauri::{
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager,
};
use tokio::sync::Notify;

use crate::models::ThemeMode;

use super::TrayHandlers;

pub struct PlatformWatcher {
  _store: SCDynamicStore,
  _notify: Arc<Notify>,
}

pub fn detect_theme_hint() -> Option<ThemeMode> {
  None
}

pub fn start_network_watcher(notify: Arc<Notify>) -> Result<Option<PlatformWatcher>, String> {
  // Apple SystemConfiguration: watch State:/Network/Interface/.*/IPv6 updates.
  let notify_for_cb = notify.clone();
  let store = SCDynamicStoreBuilder::new("cf-ddns-ipv6-tauri")
    .callback(move |_store, _changed_keys, _info| {
      notify_for_cb.notify_one();
    })
    .build();

  store
    .set_notification_keys(&[], &["State:/Network/Interface/.*/IPv6"])
    .map_err(|error| format!("failed to subscribe SystemConfiguration network updates: {error:?}"))?;

  Ok(Some(PlatformWatcher {
    _store: store,
    _notify: notify,
  }))
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
