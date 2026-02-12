use std::{ffi::c_void, sync::Arc};

use tauri::{
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle,
};
use tokio::sync::Notify;
use windows_sys::Win32::{
  Foundation::HANDLE,
  NetworkManagement::IpHelper::{
    CancelMibChangeNotify2, MIB_IPINTERFACE_ROW, MIB_NOTIFICATION_TYPE, NotifyIpInterfaceChange,
  },
  Networking::WinSock::AF_INET6,
};

use crate::models::ThemeMode;

use super::TrayHandlers;

pub struct PlatformWatcher {
  handle: HANDLE,
  _notify: Arc<Notify>,
}

unsafe impl Send for PlatformWatcher {}
unsafe impl Sync for PlatformWatcher {}

unsafe extern "system" fn on_ip_interface_change(
  callercontext: *const c_void,
  _row: *const MIB_IPINTERFACE_ROW,
  _notificationtype: MIB_NOTIFICATION_TYPE,
) {
  if callercontext.is_null() {
    return;
  }
  let notify = &*(callercontext as *const Notify);
  notify.notify_one();
}

pub fn detect_theme_hint() -> Option<ThemeMode> {
  None
}

pub fn start_network_watcher(notify: Arc<Notify>) -> Result<Option<PlatformWatcher>, String> {
  let mut handle: HANDLE = std::ptr::null_mut();
  // Microsoft Learn: NotifyIpInterfaceChange (iphlpapi.dll) callback subscription.
  let status = unsafe {
    NotifyIpInterfaceChange(
      AF_INET6,
      Some(on_ip_interface_change),
      Arc::as_ptr(&notify) as *const c_void,
      0,
      &mut handle as *mut HANDLE,
    )
  };
  if status != 0 {
    return Err(format!(
      "failed to subscribe NotifyIpInterfaceChange: {}",
      std::io::Error::from_raw_os_error(status as i32)
    ));
  }
  Ok(Some(PlatformWatcher {
    handle,
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

impl Drop for PlatformWatcher {
  fn drop(&mut self) {
    if !self.handle.is_null() {
      let _ = unsafe { CancelMibChangeNotify2(self.handle) };
    }
  }
}
