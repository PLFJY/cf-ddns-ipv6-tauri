import type { LanguageMode } from "./types";

export type UiLocale = "en" | "zh-CN";

export interface UiStrings {
  app: {
    loading: string;
    savingPreferences: string;
  };
  nav: {
    home: string;
    ddns: string;
    serviceManager: string;
  };
  header: {
    title: string;
    subtitle: string;
  };
  runtime: {
    title: string;
    autoPushLabel: string;
    launchOnStartupLabel: string;
    enabled: string;
    disabled: string;
    themeLabel: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    languageLabel: string;
    languageSystem: string;
    languageZhCn: string;
    languageEn: string;
  };
  status: {
    title: string;
    currentIpv6: string;
    notFound: string;
    lastIpv6Change: string;
    lastSync: string;
    never: string;
    syncResult: string;
    noMessage: string;
    pushNow: string;
    updating: string;
    statusKind: {
      idle: string;
      success: string;
      error: string;
    };
  };
  network: {
    title: string;
    selectedInterface: string;
    chooseInterface: string;
    mac: string;
    linkSpeed: string;
    unavailable: string;
    ipv6Addresses: string;
    noIpv6: string;
  };
  cloudflare: {
    title: string;
    zoneId: string;
    domain: string;
    resolvedRecordId: string;
    resolvedRecordPlaceholder: string;
    lookupButton: string;
    lookupBusy: string;
    ttl: string;
    ttlPlaceholder: string;
    apiToken: string;
    tokenStoredHint: string;
    tokenMissingHint: string;
    replaceToken: string;
    clearToken: string;
    save: string;
    saving: string;
  };
  localHomepageHome: {
    title: string;
    pushedDomain: string;
    localIp: string;
    homepageUrl: string;
    webPort: string;
    copyUrl: string;
    copied: string;
    copyFailed: string;
    webServiceStatus: string;
    notConfigured: string;
    running: string;
    stopped: string;
  };
  serviceManager: {
    title: string;
    addService: string;
    addDialogTitle: string;
    editDialogTitle: string;
    presetLabel: string;
    nameLabel: string;
    portLabel: string;
    iconPresetLabel: string;
    iconSearchPlaceholder: string;
    iconSearchNoResult: string;
    iconPreviewLabel: string;
    iconUrlLabel: string;
    descriptionLabel: string;
    statusLabel: string;
    online: string;
    offline: string;
    noDescription: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    copyShare: string;
    copied: string;
    copyFailed: string;
    portConflict: string;
    dragSortHint: string;
    save: string;
    cancel: string;
  };
}

const EN_STRINGS: UiStrings = {
  app: {
    loading: "Loading current DDNS state...",
    savingPreferences: "Saving preferences..."
  },
  nav: {
    home: "Home",
    ddns: "DDNS",
    serviceManager: "Service Manager"
  },
  header: {
    title: "Cloudflare IPv6 DDNS",
    subtitle: "Auto-save preferences + tray runtime"
  },
  runtime: {
    title: "Runtime Preferences",
    autoPushLabel: "Auto push updates",
    launchOnStartupLabel: "Launch on startup",
    enabled: "Enabled",
    disabled: "Disabled",
    themeLabel: "Theme",
    themeSystem: "Follow system",
    themeLight: "Light",
    themeDark: "Dark",
    languageLabel: "Language",
    languageSystem: "Follow system",
    languageZhCn: "Simplified Chinese",
    languageEn: "English"
  },
  status: {
    title: "IPv6 & Sync Status",
    currentIpv6: "Current IPv6",
    notFound: "Not found",
    lastIpv6Change: "Last IPv6 change",
    lastSync: "Last sync",
    never: "Never",
    syncResult: "Sync result",
    noMessage: "No message",
    pushNow: "Push update now",
    updating: "Updating...",
    statusKind: {
      idle: "idle",
      success: "success",
      error: "error"
    }
  },
  network: {
    title: "Interface Selection",
    selectedInterface: "Selected interface",
    chooseInterface: "Choose an interface",
    mac: "MAC",
    linkSpeed: "Link speed",
    unavailable: "Unavailable",
    ipv6Addresses: "IPv6 addresses",
    noIpv6: "no IPv6"
  },
  cloudflare: {
    title: "Cloudflare DNS",
    zoneId: "Zone ID",
    domain: "Domain (AAAA record)",
    resolvedRecordId: "Resolved Record ID",
    resolvedRecordPlaceholder: "Click lookup to resolve automatically",
    lookupButton: "Lookup AAAA record ID",
    lookupBusy: "Looking up...",
    ttl: "TTL (optional)",
    ttlPlaceholder: "Auto when empty",
    apiToken: "API token",
    tokenStoredHint: "A token is already stored securely.",
    tokenMissingHint: "No token is stored yet.",
    replaceToken: "Replace token",
    clearToken: "Clear token",
    save: "Save Cloudflare Settings",
    saving: "Saving..."
  },
  localHomepageHome: {
    title: "Local Host Homepage",
    pushedDomain: "Current pushed domain",
    localIp: "Local host IP/domain",
    homepageUrl: "Homepage URL",
    webPort: "Web port",
    copyUrl: "Copy URL",
    copied: "Copied",
    copyFailed: "Copy failed",
    webServiceStatus: "Web service status",
    notConfigured: "Not configured",
    running: "Running",
    stopped: "Stopped"
  },
  serviceManager: {
    title: "Service Manager",
    addService: "Add service",
    addDialogTitle: "Add service",
    editDialogTitle: "Edit service",
    presetLabel: "Service preset",
    nameLabel: "Service name",
    portLabel: "Port",
    iconPresetLabel: "Iconify icon",
    iconSearchPlaceholder: "Search icon (e.g. server, cloud) or paste icon id",
    iconSearchNoResult: "No matching icons in local list. You can still type an icon id manually.",
    iconPreviewLabel: "Icon preview",
    iconUrlLabel: "External icon URL",
    descriptionLabel: "Description",
    statusLabel: "Status",
    online: "Online",
    offline: "Offline",
    noDescription: "No description",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm delete",
    copyShare: "Copy & share",
    copied: "Copied",
    copyFailed: "Copy failed",
    portConflict: "Port {port} conflicts with another service.",
    dragSortHint: "Tip: drag cards to reorder services.",
    save: "Save",
    cancel: "Cancel"
  }
};

const ZH_CN_STRINGS: UiStrings = {
  app: {
    loading: "正在加载 DDNS 状态...",
    savingPreferences: "正在保存偏好设置..."
  },
  nav: {
    home: "主页",
    ddns: "DDNS",
    serviceManager: "本机主页管理"
  },
  header: {
    title: "Cloudflare IPv6 DDNS",
    subtitle: "自动保存偏好设置 + 托盘后台运行"
  },
  runtime: {
    title: "运行偏好",
    autoPushLabel: "自动推送更新",
    launchOnStartupLabel: "开机启动",
    enabled: "启用",
    disabled: "禁用",
    themeLabel: "主题",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    languageLabel: "语言",
    languageSystem: "跟随系统",
    languageZhCn: "简体中文",
    languageEn: "English"
  },
  status: {
    title: "IPv6 与同步状态",
    currentIpv6: "当前 IPv6",
    notFound: "未检测到",
    lastIpv6Change: "上次 IPv6 变化",
    lastSync: "上次同步",
    never: "从未",
    syncResult: "同步结果",
    noMessage: "无消息",
    pushNow: "立即推送更新",
    updating: "更新中...",
    statusKind: {
      idle: "空闲",
      success: "成功",
      error: "错误"
    }
  },
  network: {
    title: "网卡选择",
    selectedInterface: "当前网卡",
    chooseInterface: "选择网卡",
    mac: "MAC",
    linkSpeed: "链路速率",
    unavailable: "不可用",
    ipv6Addresses: "IPv6 地址",
    noIpv6: "无 IPv6"
  },
  cloudflare: {
    title: "Cloudflare DNS",
    zoneId: "Zone ID",
    domain: "域名（AAAA 记录）",
    resolvedRecordId: "解析到的 Record ID",
    resolvedRecordPlaceholder: "点击查询自动解析",
    lookupButton: "查询 AAAA 记录 ID",
    lookupBusy: "查询中...",
    ttl: "TTL（可选）",
    ttlPlaceholder: "留空为自动",
    apiToken: "API Token",
    tokenStoredHint: "已安全保存 token。",
    tokenMissingHint: "尚未保存 token。",
    replaceToken: "替换 token",
    clearToken: "清除 token",
    save: "保存 Cloudflare 设置",
    saving: "保存中..."
  },
  localHomepageHome: {
    title: "本机主页系统",
    pushedDomain: "当前推送域名",
    localIp: "本机 IP/域名",
    homepageUrl: "主页访问地址",
    webPort: "主页端口",
    copyUrl: "复制地址",
    copied: "已复制",
    copyFailed: "复制失败",
    webServiceStatus: "Web 服务状态",
    notConfigured: "未配置",
    running: "运行中",
    stopped: "未运行"
  },
  serviceManager: {
    title: "服务管理",
    addService: "添加服务",
    addDialogTitle: "添加服务",
    editDialogTitle: "编辑服务",
    presetLabel: "功能预设",
    nameLabel: "功能名称",
    portLabel: "端口",
    iconPresetLabel: "Iconify 图标",
    iconSearchPlaceholder: "搜索图标（如 server、cloud）或直接粘贴图标 ID",
    iconSearchNoResult: "本地列表未匹配到图标，你仍可手动输入图标 ID。",
    iconPreviewLabel: "图标预览",
    iconUrlLabel: "外部图标 URL",
    descriptionLabel: "功能说明",
    statusLabel: "状态",
    online: "在线",
    offline: "离线",
    noDescription: "无说明",
    edit: "编辑",
    delete: "删除",
    confirmDelete: "确认删除",
    copyShare: "复制并分享",
    copied: "已复制",
    copyFailed: "复制失败",
    portConflict: "端口 {port} 与其他服务冲突。",
    dragSortHint: "提示：可拖动卡片手动排序。",
    save: "保存",
    cancel: "取消"
  }
};

// MDN "Navigator: languages" and "Navigator: language":
// use browser-exposed locale preference order for "Follow system" behavior.
export function detectSystemLocale(): string {
  if (typeof navigator === "undefined") {
    return "en-US";
  }
  return navigator.languages?.[0] ?? navigator.language ?? "en-US";
}

export function resolveUiLocale(languageMode: LanguageMode, systemLocale: string): UiLocale {
  if (languageMode === "zh-CN") {
    return "zh-CN";
  }
  if (languageMode === "en") {
    return "en";
  }
  return systemLocale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function getStrings(locale: UiLocale): UiStrings {
  return locale === "zh-CN" ? ZH_CN_STRINGS : EN_STRINGS;
}
