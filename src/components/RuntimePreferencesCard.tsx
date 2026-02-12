import { Card, Field, Select, Title3 } from "@fluentui/react-components";
import type { UiStrings } from "../i18n";
import type { AppSettings, LanguageMode } from "../types";
import { FluentIcon } from "./FluentIcon";

interface RuntimePreferencesCardProps {
  draft: AppSettings;
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  panelClassName: string;
  strings: UiStrings["runtime"];
}

export function RuntimePreferencesCard(props: RuntimePreferencesCardProps) {
  const { draft, updateDraft, panelClassName, strings } = props;

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
    </Card>
  );
}
