import { Badge, Button, Card, Text, Title3, makeStyles } from "@fluentui/react-components";
import { useState } from "react";
import type { UiStrings } from "../i18n";
import type { AppSnapshot } from "../types";
import { FluentIcon } from "./FluentIcon";

interface LocalHomepageOverviewCardProps {
  snapshot: AppSnapshot;
  strings: UiStrings["localHomepageHome"];
  panelClassName: string;
  rowClassName: string;
}

const useStyles = makeStyles({
  urlRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap"
  }
});

export function LocalHomepageOverviewCard(props: LocalHomepageOverviewCardProps) {
  const styles = useStyles();
  const { snapshot, strings, panelClassName, rowClassName } = props;
  const pushedDomain = snapshot.settings.cloudflare.domain.trim();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function copyHomepageUrl() {
    try {
      await navigator.clipboard.writeText(snapshot.localHomepage.webUrl);
      setCopyMessage(strings.copied);
      setTimeout(() => setCopyMessage(null), 1200);
    } catch {
      setCopyMessage(strings.copyFailed);
      setTimeout(() => setCopyMessage(null), 1200);
    }
  }

  async function copyIpv6Url() {
    const ipv6 = snapshot.currentIpv6?.trim();
    if (!ipv6) {
      return;
    }
    const ipv6Url = `http://[${ipv6}]:${snapshot.localHomepage.webPort}/index.html`;
    try {
      await navigator.clipboard.writeText(ipv6Url);
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
        <FluentIcon icon="fluent:globe-arrow-up-24-regular" width={20} /> {strings.title}
      </Title3>
      <Text>
        {strings.pushedDomain}: <strong>{pushedDomain.length > 0 ? pushedDomain : strings.notConfigured}</strong>
      </Text>
      <Text>
        {strings.localIp}: <strong>{snapshot.localHomepage.preferredHost}</strong>
      </Text>
      <Text>{strings.webPort}: <strong>{snapshot.localHomepage.webPort}</strong></Text>
      <div className={styles.urlRow}>
        <Text>
          {strings.homepageUrl}: <strong>{snapshot.localHomepage.webUrl}</strong>
        </Text>
        <Button
          size="small"
          appearance="secondary"
          icon={<FluentIcon icon="fluent:copy-24-regular" width={14} />}
          onClick={copyHomepageUrl}
        >
          {copyMessage ?? strings.copyUrl}
        </Button>
        <Button
          size="small"
          appearance="secondary"
          icon={<FluentIcon icon="fluent:plug-connected-24-regular" width={14} />}
          onClick={copyIpv6Url}
          disabled={!snapshot.currentIpv6}
        >
          {strings.copyIpv6Url}
        </Button>
      </div>
      <div className={rowClassName}>
        <Text>{strings.webServiceStatus}:</Text>
        <Badge color={snapshot.localHomepage.running ? "success" : "danger"}>
          {snapshot.localHomepage.running ? strings.running : strings.stopped}
        </Badge>
      </div>
    </Card>
  );
}
