import { Text, Title3 } from "@fluentui/react-components";
import { FluentIcon } from "./FluentIcon";
import type { UiStrings } from "../i18n";

interface DashboardHeaderProps {
  headerClassName: string;
  headerTextClassName: string;
  strings: UiStrings["header"];
}

export function DashboardHeader(props: DashboardHeaderProps) {
  const { headerClassName, headerTextClassName, strings } = props;
  return (
    <header className={headerClassName}>
      <div className={headerTextClassName}>
        <Title3>
          <FluentIcon icon="fluent:cloud-arrow-up-24-filled" width={20} /> {strings.title}
        </Title3>
        <Text>{strings.subtitle}</Text>
      </div>
    </header>
  );
}
