import { Badge, Button, Card, FluentProvider, Select, Spinner, Text, Title2, makeStyles, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { useEffect, useMemo, useState } from "react";
import { FluentIcon } from "./components/FluentIcon";
import { copyTextToClipboard } from "./utils/clipboard";

interface ServiceRuntimeModel {
  id: string;
  name: string;
  port: number;
  icon: string;
  description: string;
  presetType: string;
  isOnline: boolean;
  shareUrl: string;
}

interface HomepageApiSnapshot {
  pushDomain: string | null;
  languageMode: "system" | "zh-CN" | "en";
  preferredHost: string;
  webPort: number;
  webUrl: string;
  services: ServiceRuntimeModel[];
}

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    padding: "24px",
    background:
      "radial-gradient(circle at 10% 5%, rgba(0,120,212,0.15) 0%, rgba(0,120,212,0) 40%), radial-gradient(circle at 90% 0%, rgba(16,124,16,0.15) 0%, rgba(16,124,16,0) 45%)"
  },
  shell: {
    maxWidth: "1080px",
    margin: "0 auto",
    display: "grid",
    gap: "14px"
  },
  statusCard: {
    display: "grid",
    gap: "8px"
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap"
  },
  themeSelect: {
    minWidth: "160px"
  },
  grid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
  },
  serviceCard: {
    display: "grid",
    gap: "10px",
    minHeight: "220px",
    gridTemplateRows: "auto auto 1fr auto"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  iconWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  }
});

function detectLocale(): "en" | "zh-CN" {
  const value = navigator.languages?.[0] ?? navigator.language ?? "en-US";
  return value.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function resolveLocale(mode: "system" | "zh-CN" | "en" | undefined): "en" | "zh-CN" {
  if (mode === "zh-CN") {
    return "zh-CN";
  }
  if (mode === "en") {
    return "en";
  }
  return detectLocale();
}

const WEB_STRINGS = {
  en: {
    title: "Local Host Homepage",
    subtitle: "Service endpoints published by this host",
    host: "Host",
    domain: "Domain",
    status: "Status",
    theme: "Theme",
    themeSystem: "Follow system",
    themeLight: "Light",
    themeDark: "Dark",
    online: "Online",
    offline: "Offline",
    loading: "Loading homepage data...",
    copy: "Copy address",
    copied: "Copied",
    noServices: "No services configured yet."
  },
  "zh-CN": {
    title: "本机主页系统",
    subtitle: "当前主机发布的服务入口",
    host: "主机地址",
    domain: "域名",
    status: "状态",
    theme: "主题",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    online: "在线",
    offline: "离线",
    loading: "正在加载主页数据...",
    copy: "复制地址",
    copied: "已复制",
    noServices: "暂无已配置服务。"
  }
} as const;

export default function HomepageApp() {
  const styles = useStyles();
  const [snapshot, setSnapshot] = useState<HomepageApiSnapshot | null>(null);
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">(() => {
    const value = window.localStorage.getItem("homepage_theme_mode");
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system";
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const locale = resolveLocale(snapshot?.languageMode);
  const strings = WEB_STRINGS[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("homepage_theme_mode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    let timer: number | null = null;
    const fetchData = async () => {
      const response = await fetch("/api/homepage/snapshot", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as HomepageApiSnapshot;
      setSnapshot(payload);
    };

    void fetchData();
    timer = window.setInterval(() => void fetchData(), 5000);
    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const theme = useMemo(() => {
    const effectiveDark =
      themeMode === "dark" || (themeMode === "system" && prefersDark);
    return effectiveDark ? webDarkTheme : webLightTheme;
  }, [prefersDark, themeMode]);
  const displayServices = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    return snapshot.services;
  }, [snapshot]);

  async function copyAddress(id: string, text: string) {
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } else {
      setCopiedId(null);
    }
  }

  if (!snapshot) {
    return (
      <FluentProvider theme={theme}>
        <div className={`${styles.page} homepage-theme-shell`}>
          <div className={styles.shell}>
            <Spinner label={strings.loading} />
          </div>
        </div>
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={theme}>
      <div className={`${styles.page} homepage-theme-shell`}>
        <div className={styles.shell}>
          <Card className={styles.statusCard}>
            <div className={styles.statusRow}>
              <Title2>{strings.title}</Title2>
              <Select
                className={styles.themeSelect}
                value={themeMode}
                onChange={(event) => {
                  const value = (event.target as HTMLSelectElement).value;
                  if (value === "system" || value === "light" || value === "dark") {
                    setThemeMode(value);
                  }
                }}
              >
                <option value="system">{strings.themeSystem}</option>
                <option value="light">{strings.themeLight}</option>
                <option value="dark">{strings.themeDark}</option>
              </Select>
            </div>
            <Text>{strings.subtitle}</Text>
            <Text>{strings.host}: <strong>{snapshot.preferredHost}</strong></Text>
            <Text>{strings.domain}: <strong>{snapshot.pushDomain ?? "-"}</strong></Text>
          </Card>

          <div className={styles.grid}>
            {displayServices.map((service) => (
              <Card
                key={service.id}
                className={styles.serviceCard}
              >
                <div className={styles.topRow}>
                  <div className={styles.iconWrap}>
                    <FluentIcon icon={service.icon} width={22} />
                    <Text weight="semibold">{service.name}</Text>
                  </div>
                  <Badge color={service.isOnline ? "success" : "danger"}>
                    {service.isOnline ? strings.online : strings.offline}
                  </Badge>
                </div>
                <Text>Port: <strong>{service.port}</strong></Text>
                <Text style={{ overflow: "hidden" }}>{service.description || "-"}</Text>
                <Button
                  appearance="secondary"
                  icon={<FluentIcon icon="fluent:copy-24-regular" width={16} />}
                  style={{ alignSelf: "end" }}
                  onClick={() => copyAddress(service.id, service.shareUrl)}
                >
                  {copiedId === service.id ? strings.copied : strings.copy}
                </Button>
              </Card>
            ))}
            {displayServices.length === 0 && (
              <Card>
                <Text>{strings.noServices}</Text>
              </Card>
            )}
          </div>
        </div>
      </div>
    </FluentProvider>
  );
}
