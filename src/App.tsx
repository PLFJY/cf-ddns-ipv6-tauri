import { Card, FluentProvider, Spinner, Text, makeStyles, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { useEffect, useMemo, useState } from "react";
import { getSnapshot, lookupRecordId, pushNow, saveSettings, subscribeNetworkChanged, subscribeSnapshot } from "./api";
import { CloudflareDnsCard } from "./components/CloudflareDnsCard";
import { DashboardHeader } from "./components/DashboardHeader";
import { InterfaceSelectionCard } from "./components/InterfaceSelectionCard";
import { LocalHomepageOverviewCard } from "./components/LocalHomepageOverviewCard";
import { NavigationView, type DesktopViewKey } from "./components/NavigationView";
import { RuntimePreferencesCard } from "./components/RuntimePreferencesCard";
import { ServiceManagerCard } from "./components/ServiceManagerCard";
import { SyncStatusCard } from "./components/SyncStatusCard";
import { detectSystemLocale, getStrings, resolveUiLocale } from "./i18n";
import type { AppSettings, AppSnapshot } from "./types";

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 5% 10%, rgba(0,120,212,0.18) 0%, rgba(0,120,212,0) 45%), radial-gradient(circle at 95% 0%, rgba(198,89,17,0.16) 0%, rgba(198,89,17,0) 45%)",
    padding: "20px"
  },
  shell: {
    maxWidth: "1260px",
    margin: "0 auto",
    display: "grid",
    gap: "14px"
  },
  contentShell: {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "220px minmax(0, 1fr)"
  },
  contentMain: {
    display: "grid",
    gap: "14px",
    minWidth: 0
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerText: {
    display: "grid",
    gap: "4px"
  },
  twoCol: {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
  },
  panel: {
    display: "grid",
    gap: "12px"
  },
  row: {
    display: "flex",
    gap: "10px",
    alignItems: "end",
    flexWrap: "wrap"
  },
  footerActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap"
  }
});

function useSystemPrefersDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setIsDark(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return isDark;
}

function useSystemLocale() {
  const [locale, setLocale] = useState(() => detectSystemLocale());

  useEffect(() => {
    const update = () => setLocale(detectSystemLocale());
    // Browser language updates are exposed via the window `languagechange` event.
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);

  return locale;
}

function normalizeDraft(snapshot: AppSnapshot): AppSettings {
  return {
    ...snapshot.settings,
    cloudflare: { ...snapshot.settings.cloudflare },
    localHomepage: {
      ...snapshot.settings.localHomepage,
      services: [...snapshot.settings.localHomepage.services]
    }
  };
}

export default function App() {
  const styles = useStyles();
  const prefersDark = useSystemPrefersDark();
  const systemLocale = useSystemLocale();
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [isReplacingToken, setIsReplacingToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isLookingUpRecord, setIsLookingUpRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DesktopViewKey>("home");

  useEffect(() => {
    let unlistenSnapshot: (() => void) | null = null;
    let unlistenNetworkChanged: (() => void) | null = null;
    getSnapshot()
      .then((data) => {
        setSnapshot(data);
        setDraft(normalizeDraft(data));
      })
      .catch((err) => setError(String(err)));

    subscribeSnapshot((data) => {
      setSnapshot(data);
      setDraft((previous) => previous ?? normalizeDraft(data));
    })
      .then((cb) => {
        unlistenSnapshot = cb;
      })
      .catch((err) => setError(String(err)));

    subscribeNetworkChanged(() => {
      getSnapshot()
        .then((data) => {
          setSnapshot(data);
          setDraft((previous) => previous ?? normalizeDraft(data));
        })
        .catch((err) => setError(String(err)));
    })
      .then((cb) => {
        unlistenNetworkChanged = cb;
      })
      .catch((err) => setError(String(err)));

    return () => {
      if (unlistenSnapshot) {
        unlistenSnapshot();
      }
      if (unlistenNetworkChanged) {
        unlistenNetworkChanged();
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      getSnapshot()
        .then((data) => {
          setSnapshot(data);
          setDraft((previous) => previous ?? normalizeDraft(data));
        })
        .catch((err) => setError(String(err)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const effectiveDark = useMemo(() => {
    if (!draft) {
      return prefersDark;
    }
    if (!draft.followSystemTheme) {
      return draft.themeMode === "dark";
    }
    if (snapshot?.linuxThemeHint) {
      return snapshot.linuxThemeHint === "dark";
    }
    return prefersDark;
  }, [draft, prefersDark, snapshot?.linuxThemeHint]);
  const locale = useMemo(
    () => resolveUiLocale(draft?.languageMode ?? "system", systemLocale),
    [draft?.languageMode, systemLocale]
  );
  const strings = useMemo(() => getStrings(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  async function saveNonCloudflare(nextDraft: AppSettings, currentSnapshot: AppSnapshot) {
    setIsAutoSaving(true);
    try {
      const result = await saveSettings({
        settings: {
          ...nextDraft,
          // Cloudflare edits are saved only via the Cloudflare card save button.
          cloudflare: { ...currentSnapshot.settings.cloudflare }
        },
        apiToken: null,
        clearToken: false
      });
      setSnapshot(result);
      setDraft((previous) =>
        previous
          ? {
              ...result.settings,
              cloudflare: previous.cloudflare,
              localHomepage: nextDraft.localHomepage
            }
          : normalizeDraft(result)
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setIsAutoSaving(false);
    }
  }

  function updateDraft(updater: (prev: AppSettings) => AppSettings, options?: { autoSave?: boolean }) {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const next = updater(prev);
      if (options?.autoSave && snapshot) {
        void saveNonCloudflare(next, snapshot);
      }
      return next;
    });
  }

  async function onSave() {
    if (!draft) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveSettings({
        settings: draft,
        apiToken: tokenInput.trim() ? tokenInput.trim() : null,
        clearToken
      });
      setSnapshot(result);
      setDraft(normalizeDraft(result));
      setTokenInput("");
      setClearToken(false);
      setIsReplacingToken(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function onManualPush() {
    setIsPushing(true);
    setError(null);
    try {
      const result = await pushNow();
      setSnapshot(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsPushing(false);
    }
  }

  async function onLookupRecordId() {
    if (!draft) {
      return;
    }
    setIsLookingUpRecord(true);
    setError(null);
    try {
      const result = await lookupRecordId({
        zoneId: draft.cloudflare.zoneId,
        domain: draft.cloudflare.domain
      });
      setSnapshot(result);
      setDraft(normalizeDraft(result));
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLookingUpRecord(false);
    }
  }

  function onTokenInputChange(value: string) {
    setTokenInput(value);
    if (clearToken && value.length > 0) {
      setClearToken(false);
    }
  }

  function onClearToken() {
    setTokenInput("");
    setClearToken(true);
    setIsReplacingToken(false);
  }

  if (!snapshot || !draft) {
    return (
      <FluentProvider theme={effectiveDark ? webDarkTheme : webLightTheme}>
        <div className={styles.page}>
          <div className={styles.shell}>
            {error && (
              <Card>
                <Text>{error}</Text>
              </Card>
            )}
            <Spinner label={strings.app.loading} />
          </div>
        </div>
      </FluentProvider>
    );
  }

  return (
    <FluentProvider
      // Fluent UI docs: "Start developing" shows using FluentProvider + webLightTheme/webDarkTheme.
      theme={effectiveDark ? webDarkTheme : webLightTheme}
    >
      <div className={styles.page}>
        <div className={styles.shell}>
          <DashboardHeader
            headerClassName={styles.header}
            headerTextClassName={styles.headerText}
            strings={strings.header}
          />

          {error && (
            <Card>
              <Text>{error}</Text>
            </Card>
          )}

          <div className={styles.contentShell}>
            <NavigationView
              selected={view}
              onSelect={setView}
              strings={strings.nav}
            />

            <div className={styles.contentMain}>
              <div key={view} className="desktop-view-stage">
                {view === "home" && (
                  <>
                    <div className={styles.twoCol}>
                      <LocalHomepageOverviewCard
                        snapshot={snapshot}
                        strings={strings.localHomepageHome}
                        panelClassName={styles.panel}
                        rowClassName={styles.row}
                      />
                      <SyncStatusCard
                        snapshot={snapshot}
                        isPushing={isPushing}
                        onManualPush={onManualPush}
                        panelClassName={styles.panel}
                        rowClassName={styles.row}
                        strings={strings.status}
                      />
                    </div>
                    <RuntimePreferencesCard
                      draft={draft}
                      updateDraft={(updater) => updateDraft(updater, { autoSave: true })}
                      panelClassName={styles.panel}
                      strings={strings.runtime}
                    />
                  </>
                )}

                {view === "ddns" && (
                  <>
                    <div className={styles.twoCol}>
                      <SyncStatusCard
                        snapshot={snapshot}
                        isPushing={isPushing}
                        onManualPush={onManualPush}
                        panelClassName={styles.panel}
                        rowClassName={styles.row}
                        strings={strings.status}
                      />
                      <RuntimePreferencesCard
                        draft={draft}
                        updateDraft={(updater) => updateDraft(updater, { autoSave: true })}
                        panelClassName={styles.panel}
                        strings={strings.runtime}
                      />
                    </div>

                    <InterfaceSelectionCard
                      snapshot={snapshot}
                      draft={draft}
                      updateDraft={(updater) => updateDraft(updater, { autoSave: true })}
                      panelClassName={styles.panel}
                      rowClassName={styles.row}
                      strings={strings.network}
                    />

                    <CloudflareDnsCard
                      draft={draft}
                      hasToken={snapshot.hasToken}
                      tokenInput={tokenInput}
                      clearToken={clearToken}
                      isReplacingToken={isReplacingToken}
                      isLookingUpRecord={isLookingUpRecord}
                      isSaving={isSaving}
                      updateDraft={(updater) => updateDraft(updater)}
                      onLookupRecordId={onLookupRecordId}
                      onTokenInputChange={onTokenInputChange}
                      onReplaceToken={() => setIsReplacingToken(true)}
                      onClearToken={onClearToken}
                      onSave={onSave}
                      panelClassName={styles.panel}
                      footerActionsClassName={styles.footerActions}
                      strings={strings.cloudflare}
                    />
                  </>
                )}

                {view === "serviceManager" && (
                  <ServiceManagerCard
                    snapshot={snapshot}
                    draft={draft}
                    updateDraft={(updater) => updateDraft(updater, { autoSave: true })}
                    strings={strings.serviceManager}
                  />
                )}
              </div>
            </div>
          </div>

          {isAutoSaving && (
            <Text>{strings.app.savingPreferences}</Text>
          )}
        </div>
      </div>
    </FluentProvider>
  );
}
