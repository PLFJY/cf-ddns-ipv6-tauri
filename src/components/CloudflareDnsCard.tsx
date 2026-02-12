import { Button, Card, Field, Input, Title3 } from "@fluentui/react-components";
import type { UiStrings } from "../i18n";
import type { AppSettings } from "../types";
import { FluentIcon } from "./FluentIcon";

interface CloudflareDnsCardProps {
  draft: AppSettings;
  hasToken: boolean;
  tokenInput: string;
  clearToken: boolean;
  isReplacingToken: boolean;
  isLookingUpRecord: boolean;
  isSaving: boolean;
  isSavingCloudflare: boolean;
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  onLookupRecordId: () => void;
  onTokenInputChange: (value: string) => void;
  onReplaceToken: () => void;
  onClearToken: () => void;
  onSave: () => void;
  onSaveCloudflareConfig: () => void;
  panelClassName: string;
  footerActionsClassName: string;
  strings: UiStrings["cloudflare"];
}

export function CloudflareDnsCard(props: CloudflareDnsCardProps) {
  const {
    draft,
    hasToken,
    tokenInput,
    clearToken,
    isReplacingToken,
    isLookingUpRecord,
    isSaving,
    isSavingCloudflare,
    updateDraft,
    onLookupRecordId,
    onTokenInputChange,
    onReplaceToken,
    onClearToken,
    onSave,
    onSaveCloudflareConfig,
    panelClassName,
    footerActionsClassName,
    strings
  } = props;

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:cloud-arrow-up-24-regular" width={20} /> {strings.title}
      </Title3>
      <Field
        label={strings.apiToken}
        hint={hasToken ? strings.tokenStoredHint : strings.tokenMissingHint}
      >
        {hasToken && tokenInput.length === 0 && !clearToken && !isReplacingToken ? (
          <Input
            type="password"
            value="********"
            readOnly
          />
        ) : (
          <Input
            type="password"
            value={tokenInput}
            onChange={(_, data) => onTokenInputChange(data.value)}
          />
        )}
      </Field>
      <div className={footerActionsClassName}>
        {hasToken && tokenInput.length === 0 && !clearToken && !isReplacingToken && (
          <Button
            appearance="secondary"
            onClick={onReplaceToken}
          >
            {strings.replaceToken}
          </Button>
        )}
        <Button
          appearance="subtle"
          onClick={onClearToken}
        >
          {strings.clearToken}
        </Button>
        <Button
          className="cloudflare-save-token-button"
          appearance="primary"
          onClick={onSave}
          disabled={isSaving}
          icon={
            <FluentIcon
              icon={isSaving ? "fluent:arrow-sync-24-regular" : "fluent:key-24-regular"}
              width={16}
              style={isSaving ? { animation: "lookup-spin 0.9s linear infinite" } : undefined}
            />
          }
        >
          {isSaving ? strings.savingToken : strings.saveToken}
        </Button>
      </div>
      <Field label={strings.zoneId}>
        <Input
          value={draft.cloudflare.zoneId}
          onChange={(_, data) =>
            updateDraft((prev) => ({
              ...prev,
              cloudflare: { ...prev.cloudflare, zoneId: data.value.trim() }
            }))
          }
        />
      </Field>
      <Field label={strings.domain}>
        <Input
          value={draft.cloudflare.domain}
          onChange={(_, data) =>
            updateDraft((prev) => ({
              ...prev,
              cloudflare: {
                ...prev.cloudflare,
                domain: data.value.trim(),
                recordId: ""
              }
            }))
          }
        />
      </Field>
      <Button
        appearance="secondary"
        onClick={onLookupRecordId}
        disabled={isLookingUpRecord}
        icon={
          <FluentIcon
            icon={isLookingUpRecord ? "fluent:arrow-sync-24-regular" : "fluent:search-24-regular"}
            width={16}
            style={isLookingUpRecord ? { animation: "lookup-spin 0.9s linear infinite" } : undefined}
          />
        }
      >
        {isLookingUpRecord ? strings.lookupBusy : strings.lookupButton}
      </Button>
      <Field label={strings.resolvedRecordId}>
        <Input
          value={draft.cloudflare.recordId}
          readOnly
          placeholder={strings.resolvedRecordPlaceholder}
        />
      </Field>
      <Field label={strings.ttl}>
        <Input
          type="number"
          placeholder={strings.ttlPlaceholder}
          value={draft.cloudflare.ttl == null ? "" : String(draft.cloudflare.ttl)}
          onChange={(_, data) =>
            updateDraft((prev) => {
              const trimmed = data.value.trim();
              const ttl = trimmed.length === 0 ? null : Number.parseInt(trimmed, 10);
              return {
                ...prev,
                cloudflare: {
                  ...prev.cloudflare,
                  ttl: Number.isFinite(ttl) ? ttl : prev.cloudflare.ttl
                }
              };
            })
          }
        />
      </Field>
      <div className={footerActionsClassName}>
        <Button
          className="cloudflare-save-config-button"
          appearance="primary"
          onClick={onSaveCloudflareConfig}
          disabled={isSavingCloudflare}
          icon={
            <FluentIcon
              icon={isSavingCloudflare ? "fluent:arrow-sync-24-regular" : "fluent:cloud-arrow-up-24-regular"}
              width={16}
              style={isSavingCloudflare ? { animation: "lookup-spin 0.9s linear infinite" } : undefined}
            />
          }
        >
          {isSavingCloudflare ? strings.savingConfig : strings.saveConfig}
        </Button>
      </div>
    </Card>
  );
}
