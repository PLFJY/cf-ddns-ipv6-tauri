import { Badge, Button, Card, Text, Title3, makeStyles } from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";
import type { UiStrings } from "../i18n";
import type { AppSnapshot } from "../types";
import { copyTextToClipboard } from "../utils/clipboard";
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
  const [copyFeedback, setCopyFeedback] = useState<{ target: "homepage" | "ipv6"; message: string } | null>(null);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setCopyFeedbackWithTimer(target: "homepage" | "ipv6", copied: boolean) {
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
    }
    setCopyFeedback({
      target,
      message: copied ? strings.copied : strings.copyFailed
    });
    copyFeedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), 1200);
  }

  async function copyHomepageUrl() {
    const copied = await copyTextToClipboard(snapshot.localHomepage.webUrl);
    setCopyFeedbackWithTimer("homepage", copied);
  }

  async function copyIpv6Url() {
    const ipv6 = snapshot.currentIpv6?.trim();
    if (!ipv6) {
      return;
    }
    const ipv6Url = `http://[${ipv6}]:${snapshot.localHomepage.webPort}/index.html`;
    const copied = await copyTextToClipboard(ipv6Url);
    setCopyFeedbackWithTimer("ipv6", copied);
  }

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

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
          {copyFeedback?.target === "homepage" ? copyFeedback.message : strings.copyUrl}
        </Button>
        <Button
          size="small"
          appearance="secondary"
          icon={<FluentIcon icon="fluent:plug-connected-24-regular" width={14} />}
          onClick={copyIpv6Url}
          disabled={!snapshot.currentIpv6}
        >
          {copyFeedback?.target === "ipv6" ? copyFeedback.message : strings.copyIpv6Url}
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
