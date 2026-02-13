import { Badge, Button, Card, Text, Title3 } from "@fluentui/react-components";
import { useState } from "react";
import type { UiStrings } from "../i18n";
import type { AppSnapshot, SyncStatusKind } from "../types";
import { FluentIcon } from "./FluentIcon";

interface SyncStatusCardProps {
  snapshot: AppSnapshot;
  isPushing: boolean;
  onManualPush: () => void;
  panelClassName: string;
  rowClassName: string;
  strings: UiStrings["status"];
}

function formatTimestamp(value: string | null, neverText: string): string {
  if (!value) {
    return neverText;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusTone(status: SyncStatusKind): "brand" | "danger" | "informative" {
  if (status === "success") {
    return "brand";
  }
  if (status === "error") {
    return "danger";
  }
  return "informative";
}

export function SyncStatusCard(props: SyncStatusCardProps) {
  const { snapshot, isPushing, onManualPush, panelClassName, rowClassName, strings } = props;
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const carrierText = (() => {
    const geo = snapshot.currentIpv6Geo;
    if (!geo) {
      return strings.notFound;
    }
    const mappedName = geo.carrierName?.trim();
    if (mappedName) {
      return mappedName;
    }
    const org = geo.organization?.trim() || "";
    const asnPart = geo.asn != null ? `AS${geo.asn}` : "";
    const joined = [org, asnPart].filter((part) => part.length > 0).join(" ");
    return joined || strings.notFound;
  })();
  const countryCode = snapshot.currentIpv6Geo?.countryIsoCode?.toLowerCase() ?? null;
  const countryIcon = countryCode ? `circle-flags:${countryCode}` : "fluent:flag-24-regular";

  async function copyIpv6Address() {
    const ipv6 = snapshot.currentIpv6?.trim();
    if (!ipv6) {
      return;
    }
    try {
      await navigator.clipboard.writeText(ipv6);
      setCopyMessage(strings.copied);
      setTimeout(() => setCopyMessage(null), 1200);
    } catch {
      setCopyMessage(strings.copyFailed);
      setTimeout(() => setCopyMessage(null), 1200);
    }
  }

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:pulse-24-regular" width={20} /> {strings.title}
      </Title3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Text>
          {strings.currentIpv6}: <strong>{snapshot.currentIpv6 ?? strings.notFound}</strong>
        </Text>
        <Button
          size="small"
          appearance="secondary"
          icon={<FluentIcon icon="fluent:copy-24-regular" width={14} />}
          onClick={copyIpv6Address}
          disabled={!snapshot.currentIpv6}
        >
          {copyMessage ?? strings.copyIpv6}
        </Button>
      </div>
      <Text>
        {strings.carrier}:{" "}
        <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FluentIcon icon={countryIcon} width={18} />
          {carrierText}
        </strong>
      </Text>
      <Text>
        {strings.lastIpv6Change}: <strong>{formatTimestamp(snapshot.cache.lastIpv6ChangeTime, strings.never)}</strong>
      </Text>
      <Text>
        {strings.lastSync}: <strong>{formatTimestamp(snapshot.cache.lastSyncTime, strings.never)}</strong>
      </Text>
      <div className={rowClassName}>
        <Text>{strings.syncResult}:</Text>
        <Badge color={statusTone(snapshot.cache.lastSyncStatus.kind)}>
          {strings.statusKind[snapshot.cache.lastSyncStatus.kind]}
        </Badge>
        <Text>{snapshot.cache.lastSyncStatus.message ?? strings.noMessage}</Text>
      </div>
      <Button
        className="sync-push-button"
        appearance="secondary"
        onClick={onManualPush}
        disabled={isPushing}
        icon={
          <FluentIcon
            icon={isPushing ? "fluent:arrow-sync-24-regular" : "fluent:arrow-upload-24-regular"}
            width={16}
            style={isPushing ? { animation: "lookup-spin 0.9s linear infinite" } : undefined}
          />
        }
      >
        {isPushing ? strings.updating : strings.pushNow}
      </Button>
    </Card>
  );
}
