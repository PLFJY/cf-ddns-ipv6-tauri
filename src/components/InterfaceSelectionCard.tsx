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

const ALL_INTERFACES_VALUE = "__all_interfaces__";

export function InterfaceSelectionCard(props: InterfaceSelectionCardProps) {
  const { snapshot, draft, updateDraft, panelClassName, rowClassName, strings } = props;
  const isAllInterfacesSelected = draft.selectedInterface == null;
  const selectedInterface = snapshot.interfaces.find((item) => item.id === draft.selectedInterface) ?? null;
  const displayedInterfaces = isAllInterfacesSelected
    ? snapshot.interfaces
    : (selectedInterface ? [selectedInterface] : []);
  const displayedIpv6 = Array.from(new Set(displayedInterfaces.flatMap((item) => item.ipv6Addresses))).sort();

  return (
    <Card className={panelClassName}>
      <Title3>
        <FluentIcon icon="fluent:network-check-24-regular" width={20} /> {strings.title}
      </Title3>
      <Field label={strings.selectedInterface}>
        <Combobox
          selectedOptions={[isAllInterfacesSelected ? ALL_INTERFACES_VALUE : (draft.selectedInterface ?? ALL_INTERFACES_VALUE)]}
          value={isAllInterfacesSelected ? strings.allInterfaces : (selectedInterface?.label ?? "")}
          placeholder={strings.chooseInterface}
          onOptionSelect={(_, data) =>
            updateDraft((prev) => ({
              ...prev,
              selectedInterface:
                data.optionValue && String(data.optionValue) !== ALL_INTERFACES_VALUE
                  ? String(data.optionValue)
                  : null
            }))
          }
        >
          <Option key={ALL_INTERFACES_VALUE} value={ALL_INTERFACES_VALUE} text={strings.allInterfaces}>
            {strings.allInterfaces}
          </Option>
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
        {strings.mac}: <strong>{isAllInterfacesSelected ? strings.unavailable : (selectedInterface?.macAddress ?? strings.unavailable)}</strong>
      </Text>
      <Text>
        {strings.linkSpeed}: <strong>{isAllInterfacesSelected ? strings.unavailable : (selectedInterface?.linkSpeedMbps ? `${selectedInterface.linkSpeedMbps} Mbps` : strings.unavailable)}</strong>
      </Text>
      <div className={rowClassName}>
        <Text>{strings.ipv6Addresses}:</Text>
        {displayedIpv6.length === 0 && <Badge>{strings.noIpv6}</Badge>}
        {displayedIpv6.map((ip) => (
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
