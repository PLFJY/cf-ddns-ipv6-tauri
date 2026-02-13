import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Title3
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { restartApp } from "../api";
import type { UiStrings } from "../i18n";
import type { AppSettings, LanguageMode } from "../types";
import { FluentIcon } from "./FluentIcon";

interface RuntimePreferencesCardProps {
  draft: AppSettings;
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  onSavePort: (port: number) => Promise<boolean>;
  isSavingPort: boolean;
  panelClassName: string;
  strings: UiStrings["runtime"];
}

export function RuntimePreferencesCard(props: RuntimePreferencesCardProps) {
  const { draft, updateDraft, onSavePort, isSavingPort, panelClassName, strings } = props;
  const [portInput, setPortInput] = useState(String(draft.localHomepage.webPort));
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  useEffect(() => {
    setPortInput(String(draft.localHomepage.webPort));
  }, [draft.localHomepage.webPort]);

  function parsePort(value: string): number | null {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      return null;
    }
    return parsed;
  }

  async function savePortAndPromptRestart() {
    const parsed = parsePort(portInput);
    if (parsed == null) {
      setPortInput(String(draft.localHomepage.webPort));
      return;
    }
    if (parsed === draft.localHomepage.webPort) {
      setRestartDialogOpen(true);
      return;
    }
    const saved = await onSavePort(parsed);
    if (saved) {
      setRestartDialogOpen(true);
    }
  }

  function restartNow() {
    void restartApp();
  }

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:settings-24-regular" width={20} /> {strings.title}
      </Title3>
      <Field label={strings.autoPushLabel}>
        <Select
          value={draft.autoPush ? "enabled" : "disabled"}
          onChange={(_, data) =>
            updateDraft((prev) => ({ ...prev, autoPush: data.value === "enabled" }))
          }
        >
          <option value="enabled">{strings.enabled}</option>
          <option value="disabled">{strings.disabled}</option>
        </Select>
      </Field>
      <Field label={strings.launchOnStartupLabel}>
        <Select
          value={draft.launchOnStartup ? "enabled" : "disabled"}
          onChange={(_, data) =>
            updateDraft((prev) => ({ ...prev, launchOnStartup: data.value === "enabled" }))
          }
        >
          <option value="enabled">{strings.enabled}</option>
          <option value="disabled">{strings.disabled}</option>
        </Select>
      </Field>
      <Field label={strings.localHomepagePortLabel} hint={strings.localHomepagePortHint}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Input
            type="number"
            value={portInput}
            onChange={(_, data) => {
              setPortInput(data.value);
            }}
            onBlur={() => {
              const parsed = parsePort(portInput);
              if (parsed == null) {
                setPortInput(String(draft.localHomepage.webPort));
              }
            }}
          />
          <Button
            appearance="primary"
            onClick={() => void savePortAndPromptRestart()}
            disabled={isSavingPort}
          >
            {isSavingPort ? strings.savingPort : strings.savePort}
          </Button>
        </div>
      </Field>
      <Field label={strings.themeLabel}>
        <Select
          value={
            draft.followSystemTheme
              ? "system"
              : draft.themeMode === "dark"
                ? "dark"
                : "light"
          }
          onChange={(_, data) => {
            const next = data.value as "system" | "light" | "dark";
            updateDraft((prev) => {
              if (next === "system") {
                return { ...prev, followSystemTheme: true };
              }
              return {
                ...prev,
                followSystemTheme: false,
                themeMode: next === "dark" ? "dark" : "light"
              };
            });
          }}
        >
          <option value="system">{strings.themeSystem}</option>
          <option value="light">{strings.themeLight}</option>
          <option value="dark">{strings.themeDark}</option>
        </Select>
      </Field>
      <Field label={strings.languageLabel}>
        <Select
          value={draft.languageMode}
          onChange={(_, data) =>
            updateDraft((prev) => ({ ...prev, languageMode: data.value as LanguageMode }))
          }
        >
          <option value="system">{strings.languageSystem}</option>
          <option value="zh-CN">{strings.languageZhCn}</option>
          <option value="en">{strings.languageEn}</option>
        </Select>
      </Field>
      <Dialog open={restartDialogOpen} onOpenChange={(_, data) => setRestartDialogOpen(data.open)}>
        <DialogSurface className="service-manager-dialog">
          <DialogBody>
            <DialogTitle>{strings.restartDialogTitle}</DialogTitle>
            <DialogContent>{strings.restartDialogContent}</DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setRestartDialogOpen(false)}>
                {strings.restartLater}
              </Button>
              <Button appearance="primary" onClick={restartNow}>
                {strings.restartNow}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Card>
  );
}
