use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
  Light,
  Dark,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum LanguageMode {
  #[serde(rename = "system")]
  System,
  #[serde(rename = "zh-CN")]
  ZhCn,
  #[serde(rename = "en")]
  En,
}

fn default_language_mode() -> LanguageMode {
  LanguageMode::System
}

fn default_local_homepage_port() -> u16 {
  8080
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudflareSettings {
  pub zone_id: String,
  #[serde(default)]
  pub domain: String,
  #[serde(default)]
  pub record_id: String,
  pub ttl: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceModel {
  pub id: String,
  pub name: String,
  pub port: u16,
  pub icon: String,
  pub description: String,
  pub preset_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalHomepageSettings {
  #[serde(default = "default_local_homepage_port")]
  pub web_port: u16,
  #[serde(default)]
  pub services: Vec<ServiceModel>,
}

impl Default for LocalHomepageSettings {
  fn default() -> Self {
    Self {
      web_port: default_local_homepage_port(),
      services: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
  pub selected_interface: Option<String>,
  pub auto_push: bool,
  pub launch_on_startup: bool,
  pub lightweight_mode: bool,
  pub follow_system_theme: bool,
  pub theme_mode: ThemeMode,
  #[serde(default = "default_language_mode")]
  pub language_mode: LanguageMode,
  pub cloudflare: CloudflareSettings,
  #[serde(default)]
  pub local_homepage: LocalHomepageSettings,
}

impl Default for AppSettings {
  fn default() -> Self {
    Self {
      selected_interface: None,
      auto_push: true,
      launch_on_startup: false,
      lightweight_mode: false,
      follow_system_theme: true,
      theme_mode: ThemeMode::Light,
      language_mode: LanguageMode::System,
      cloudflare: CloudflareSettings {
        zone_id: String::new(),
        domain: String::new(),
        record_id: String::new(),
        ttl: None,
      },
      local_homepage: LocalHomepageSettings::default(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatusKind {
  Idle,
  Success,
  Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
  pub kind: SyncStatusKind,
  pub message: Option<String>,
}

impl Default for SyncStatus {
  fn default() -> Self {
    Self {
      kind: SyncStatusKind::Idle,
      message: None,
    }
  }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCache {
  pub last_known_ipv6: Option<String>,
  pub last_ipv6_change_time: Option<String>,
  pub last_sync_time: Option<String>,
  pub last_sync_status: SyncStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
  pub settings: AppSettings,
  pub cache: RuntimeCache,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InterfaceInfo {
  pub id: String,
  pub label: String,
  pub mac_address: Option<String>,
  pub ipv6_addresses: Vec<String>,
  pub link_speed_mbps: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRuntimeModel {
  pub id: String,
  pub name: String,
  pub port: u16,
  pub icon: String,
  pub description: String,
  pub preset_type: String,
  pub is_online: bool,
  pub share_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalHomepageRuntime {
  pub running: bool,
  pub web_port: u16,
  pub web_url: String,
  pub preferred_host: String,
  pub services: Vec<ServiceRuntimeModel>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSnapshot {
  pub settings: AppSettings,
  pub cache: RuntimeCache,
  pub current_ipv6: Option<String>,
  pub interfaces: Vec<InterfaceInfo>,
  pub has_token: bool,
  pub linux_theme_hint: Option<ThemeMode>,
  pub local_homepage: LocalHomepageRuntime,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingsRequest {
  pub settings: AppSettings,
  pub api_token: Option<String>,
  pub clear_token: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LookupRecordIdRequest {
  pub zone_id: String,
  pub domain: String,
}
