use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use tauri::{AppHandle, Manager};

use crate::models::AppConfig;

const CONFIG_FILE_NAME: &str = "settings.json";

pub fn load_or_default(app: &AppHandle) -> Result<(AppConfig, PathBuf)> {
  // Tauri Rust API docs: `PathResolver::app_config_dir` is the app-owned config directory.
  let config_dir = app
    .path()
    .app_config_dir()
    .context("failed to resolve app config directory")?;
  std::fs::create_dir_all(&config_dir).context("failed to create app config directory")?;
  let config_path = config_dir.join(CONFIG_FILE_NAME);

  if !config_path.exists() {
    let config = AppConfig::default();
    save_config(&config_path, &config)?;
    return Ok((config, config_path));
  }

  let text = std::fs::read_to_string(&config_path).context("failed to read config file")?;
  let mut config = serde_json::from_str::<AppConfig>(&text).context("failed to parse config json")?;
  normalize(&mut config);
  Ok((config, config_path))
}

pub fn save_config(path: &Path, config: &AppConfig) -> Result<()> {
  let json = serde_json::to_string_pretty(config).context("failed to serialize config")?;
  std::fs::write(path, json).with_context(|| format!("failed to write config to {}", path.display()))?;
  Ok(())
}

pub fn normalize(config: &mut AppConfig) {
  if config.settings.local_homepage.web_port == 0 || config.settings.local_homepage.web_port == 80 {
    config.settings.local_homepage.web_port = 8080;
  }
}
