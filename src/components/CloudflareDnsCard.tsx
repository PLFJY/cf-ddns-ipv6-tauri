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
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  onLookupRecordId: () => void;
  onTokenInputChange: (value: string) => void;
  onReplaceToken: () => void;
  onClearToken: () => void;
  onSave: () => void;
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
    updateDraft,
    onLookupRecordId,
    onTokenInputChange,
    onReplaceToken,
    onClearToken,
    onSave,
    panelClassName,
    footerActionsClassName,
    strings
  } = props;

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:cloud-arrow-up-24-regular" width={20} /> {strings.title}
      </Title3>
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
      <Field label={strings.resolvedRecordId}>
        <Input
          value={draft.cloudflare.recordId}
          readOnly
          placeholder={strings.resolvedRecordPlaceholder}
        />
      </Field>
      <Button
        appearance="secondary"
        onClick={onLookupRecordId}
        disabled={isLookingUpRecord}
      >
        {isLookingUpRecord ? strings.lookupBusy : strings.lookupButton}
      </Button>
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
          appearance="primary"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? strings.saving : strings.save}
        </Button>
      </div>
    </Card>
  );
}
