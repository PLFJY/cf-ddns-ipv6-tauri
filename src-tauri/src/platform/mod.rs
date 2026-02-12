use std::{
  future::Future,
  sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
  },
};

use tauri::AppHandle;
use tokio::sync::Notify;

use crate::models::ThemeMode;

#[derive(Clone)]
pub struct TrayHandlers {
  pub on_show_main: Arc<dyn Fn(&AppHandle) + Send + Sync>,
  pub on_manual_update: Arc<dyn Fn(&AppHandle) + Send + Sync>,
  pub on_toggle_auto_update: Arc<dyn Fn(&AppHandle) + Send + Sync>,
  pub on_quit: Arc<dyn Fn(&AppHandle) + Send + Sync>,
}

#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "linux")]
pub mod linux;

#[cfg(target_os = "windows")]
pub use windows as current;
#[cfg(target_os = "macos")]
pub use macos as current;
#[cfg(target_os = "linux")]
pub use linux as current;

pub type PlatformWatcher = current::PlatformWatcher;

pub fn detect_theme_hint() -> Option<ThemeMode> {
  current::detect_theme_hint()
}

pub fn start_network_watcher(notify: Arc<Notify>) -> Result<Option<PlatformWatcher>, String> {
  current::start_network_watcher(notify)
}

pub fn install_tray(
  app: &AppHandle,
  menu: tauri::menu::Menu<tauri::Wry>,
  handlers: TrayHandlers,
) -> Result<(), String> {
  current::install_tray(app, menu, handlers)
}

pub fn spawn_background_worker<F, Fut>(
  notify: Arc<Notify>,
  shutting_down: Arc<AtomicBool>,
  mut on_tick: F,
) where
  F: FnMut() -> Fut + Send + 'static,
  Fut: Future<Output = ()> + Send + 'static,
{
  tauri::async_runtime::spawn(async move {
    on_tick().await;
    loop {
      if shutting_down.load(Ordering::SeqCst) {
        break;
      }
      notify.notified().await;
      if shutting_down.load(Ordering::SeqCst) {
        break;
      }
      on_tick().await;
    }
  });
}
