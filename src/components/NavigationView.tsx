import { Card, Tab, TabList, makeStyles } from "@fluentui/react-components";
import type { UiStrings } from "../i18n";
import { FluentIcon } from "./FluentIcon";

export type DesktopViewKey = "home" | "ddns" | "serviceManager";

interface NavigationViewProps {
  selected: DesktopViewKey;
  onSelect: (key: DesktopViewKey) => void;
  strings: UiStrings["nav"];
}

const useStyles = makeStyles({
  navCard: {
    minWidth: "210px",
    alignSelf: "start",
    position: "sticky",
    top: "20px"
  },
  tabList: {
    width: "100%"
  },
  tabLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  }
});

// Fluent UI docs ("TabList"): selectedValue/onTabSelect provide a robust single-selection navigation model.
export function NavigationView(props: NavigationViewProps) {
  const { selected, onSelect, strings } = props;
  const styles = useStyles();

  return (
    <Card className={styles.navCard}>
      <TabList
        vertical
        className={styles.tabList}
        selectedValue={selected}
        onTabSelect={(_, data) => onSelect(data.value as DesktopViewKey)}
      >
        <Tab
          value="home"
          icon={<FluentIcon icon="fluent:home-24-regular" width={20} />}
        >
          <span className={styles.tabLabel}>{strings.home}</span>
        </Tab>
        <Tab
          value="ddns"
          icon={<FluentIcon icon="fluent:cloud-arrow-up-24-regular" width={20} />}
        >
          <span className={styles.tabLabel}>{strings.ddns}</span>
        </Tab>
        <Tab
          value="serviceManager"
          icon={<FluentIcon icon="fluent:server-24-regular" width={20} />}
        >
          <span className={styles.tabLabel}>{strings.serviceManager}</span>
        </Tab>
      </TabList>
    </Card>
  );
}
