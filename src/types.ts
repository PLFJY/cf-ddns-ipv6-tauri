export type ThemeMode = "light" | "dark";
export type LanguageMode = "system" | "zh-CN" | "en";
export type SyncStatusKind = "idle" | "success" | "error";

export interface CloudflareSettings {
  zoneId: string;
  domain: string;
  recordId: string;
  ttl: number | null;
}

export interface ServiceModel {
  id: string;
  name: string;
  port: number;
  icon: string;
  description: string;
  presetType: string;
}

export interface LocalHomepageSettings {
  webPort: number;
  services: ServiceModel[];
}

export interface AppSettings {
  selectedInterface: string | null;
  autoPush: boolean;
  launchOnStartup: boolean;
  lightweightMode: boolean;
  followSystemTheme: boolean;
  themeMode: ThemeMode;
  languageMode: LanguageMode;
  cloudflare: CloudflareSettings;
  localHomepage: LocalHomepageSettings;
}

export interface SyncStatus {
  kind: SyncStatusKind;
  message: string | null;
}

export interface RuntimeCache {
  lastKnownIpv6: string | null;
  lastIpv6ChangeTime: string | null;
  lastSyncTime: string | null;
  lastSyncStatus: SyncStatus;
}

export interface InterfaceInfo {
  id: string;
  label: string;
  macAddress: string | null;
  ipv6Addresses: string[];
  linkSpeedMbps: number | null;
}

export interface AppSnapshot {
  bootstrapping: boolean;
  settings: AppSettings;
  cache: RuntimeCache;
  currentIpv6: string | null;
  interfaces: InterfaceInfo[];
  hasToken: boolean;
  linuxThemeHint: ThemeMode | null;
  localHomepage: LocalHomepageRuntime;
}

export interface ServiceRuntimeModel extends ServiceModel {
  isOnline: boolean;
  shareUrl: string;
}

export interface LocalHomepageRuntime {
  running: boolean;
  webPort: number;
  webUrl: string;
  preferredHost: string;
  services: ServiceRuntimeModel[];
}

export interface SaveSettingsRequest {
  settings: AppSettings;
  apiToken: string | null;
  clearToken: boolean;
}

export interface LookupRecordIdRequest {
  zoneId: string;
  domain: string;
}
