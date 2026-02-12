import { Badge, Card, Combobox, Field, Option, Text, Title3 } from "@fluentui/react-components";
import type { UiStrings } from "../i18n";
import type { AppSettings, AppSnapshot } from "../types";
import { FluentIcon } from "./FluentIcon";

interface InterfaceSelectionCardProps {
  snapshot: AppSnapshot;
  draft: AppSettings;
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  panelClassName: string;
  rowClassName: string;
  strings: UiStrings["network"];
}

export function InterfaceSelectionCard(props: InterfaceSelectionCardProps) {
  const { snapshot, draft, updateDraft, panelClassName, rowClassName, strings } = props;
  const selectedInterface = snapshot.interfaces.find((item) => item.id === draft.selectedInterface) ?? null;

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:network-check-24-regular" width={20} /> {strings.title}
      </Title3>
      <Field label={strings.selectedInterface}>
        <Combobox
          selectedOptions={draft.selectedInterface ? [draft.selectedInterface] : []}
          value={selectedInterface?.label ?? ""}
          placeholder={strings.chooseInterface}
          onOptionSelect={(_, data) =>
            updateDraft((prev) => ({
              ...prev,
              selectedInterface: data.optionValue ? String(data.optionValue) : null
            }))
          }
        >
          {snapshot.interfaces.map((item) => (
            <Option
              key={item.id}
              value={item.id}
              text={item.label}
            >
              {item.label}
            </Option>
          ))}
        </Combobox>
      </Field>
      <Text>
        {strings.mac}: <strong>{selectedInterface?.macAddress ?? strings.unavailable}</strong>
      </Text>
      <Text>
        {strings.linkSpeed}: <strong>{selectedInterface?.linkSpeedMbps ? `${selectedInterface.linkSpeedMbps} Mbps` : strings.unavailable}</strong>
      </Text>
      <div className={rowClassName}>
        <Text>{strings.ipv6Addresses}:</Text>
        {(selectedInterface?.ipv6Addresses ?? []).length === 0 && <Badge>{strings.noIpv6}</Badge>}
        {(selectedInterface?.ipv6Addresses ?? []).map((ip) => (
          <Badge
            key={`selected-${ip}`}
            appearance={ip === snapshot.currentIpv6 ? "filled" : "outline"}
          >
            {ip}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
