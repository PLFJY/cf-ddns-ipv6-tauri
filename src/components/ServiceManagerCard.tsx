import {
  Badge,
  Button,
  Card,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Option,
  Text,
  Title3,
  makeStyles
} from "@fluentui/react-components";
import { useMemo, useState } from "react";
import type { UiStrings } from "../i18n";
import { findPreset, SERVICE_PRESETS } from "../servicePresets";
import type { AppSettings, AppSnapshot, ServiceModel, ServiceRuntimeModel } from "../types";
import { FluentIcon } from "./FluentIcon";

interface ServiceManagerCardProps {
  snapshot: AppSnapshot;
  draft: AppSettings;
  updateDraft: (updater: (prev: AppSettings) => AppSettings) => void;
  strings: UiStrings["serviceManager"];
}

interface EditingModel {
  id: string | null;
  presetType: string;
  name: string;
  port: string;
  icon: string;
  description: string;
  iconUrl: string;
}

const useStyles = makeStyles({
  root: {
    display: "grid",
    gap: "12px"
  },
  head: {
    display: "grid",
    gap: "4px"
  },
  title: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  },
  hint: {
    opacity: 0.75
  },
  grid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))"
  },
  card: {
    display: "grid",
    gap: "10px"
  },
  addCard: {
    display: "grid",
    placeItems: "center",
    minHeight: "210px",
    background: "rgba(128,128,128,0.12)"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap"
  },
  dragHandle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    opacity: 0.75,
    cursor: "grab",
    userSelect: "none"
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  optionRow: {
    display: "inline-flex",
    gap: "8px",
    alignItems: "center"
  },
  warning: {
    color: "#d13438"
  }
});

const ICON_CHOICES = [
  "fluent:apps-list-detail-24-regular",
  "fluent:server-24-regular",
  "fluent:server-24-regular",
  "fluent:server-link-24-regular",
  "fluent:cloud-24-regular",
  "fluent:cloud-arrow-up-24-regular",
  "fluent:cloud-sync-24-regular",
  "fluent:globe-24-regular",
  "fluent:globe-desktop-24-regular",
  "fluent:database-24-regular",
  "fluent:database-link-24-regular",
  "fluent:data-pie-24-regular",
  "fluent:folder-24-regular",
  "fluent:folder-open-24-regular",
  "fluent:terminal-24-regular",
  "fluent:code-24-regular",
  "fluent:video-24-regular",
  "fluent:play-circle-24-regular",
  "fluent:games-24-regular",
  "fluent:controller-24-regular",
  "fluent:box-24-regular",
  "fluent:box-multiple-24-regular",
  "fluent:desktop-24-regular",
  "fluent:desktop-pulse-24-regular",
  "fluent:shield-lock-24-regular",
  "fluent:shield-checkmark-24-regular",
  "fluent:key-24-regular",
  "fluent:lock-closed-24-regular",
  "fluent:settings-24-regular",
  "fluent:network-check-24-regular",
  "fluent:wifi-1-24-regular",
  "fluent:wifi-2-24-regular",
  "fluent:wifi-3-24-regular",
  "fluent:router-24-regular",
  "fluent:device-eq-24-regular",
  "fluent:port-hdmi-24-regular",
  "fluent:branch-24-regular",
  "fluent:arrow-upload-24-regular",
  "fluent:arrow-download-24-regular",
  "fluent:arrow-sync-24-regular",
  "fluent:flash-24-regular",
  "fluent:gauge-24-regular",
  "fluent:poll-24-regular",
  "fluent:chart-multiple-24-regular",
  "fluent:clipboard-data-bar-24-regular",
  "fluent:document-table-24-regular",
  "fluent:mail-24-regular",
  "fluent:chat-24-regular",
  "fluent:calendar-24-regular",
  "fluent:home-24-regular",
  "fluent:building-24-regular",
  "fluent:window-24-regular",
  "fluent:window-console-20-regular",
  "fluent:phone-laptop-24-regular",
  "fluent:phone-24-regular",
  "fluent:tablet-24-regular",
  "fluent:print-24-regular",
  "fluent:camera-24-regular",
  "fluent:record-24-regular",
  "fluent:image-24-regular",
  "fluent:person-wrench-24-regular"
];

function createNewServiceDraft(existingCount: number): EditingModel {
  const preset = findPreset("Custom");
  return {
    id: null,
    presetType: "Custom",
    name: `New Server ${existingCount + 1}`,
    port: String(preset?.defaultPort ?? 8080),
    icon: preset?.icon ?? "fluent:apps-list-detail-24-regular",
    description: preset?.defaultDescription ?? "",
    iconUrl: ""
  };
}

function toEditingModel(service: ServiceModel): EditingModel {
  return {
    id: service.id,
    presetType: service.presetType,
    name: service.name,
    port: String(service.port),
    icon: service.icon,
    description: service.description,
    iconUrl: service.icon.startsWith("http") ? service.icon : ""
  };
}

function createServiceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `svc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function reorderServices(services: ServiceModel[], fromId: string, toId: string): ServiceModel[] {
  if (fromId === toId) {
    return services;
  }
  const fromIndex = services.findIndex((service) => service.id === fromId);
  const toIndex = services.findIndex((service) => service.id === toId);
  if (fromIndex < 0 || toIndex < 0) {
    return services;
  }
  const next = [...services];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ServiceManagerCard(props: ServiceManagerCardProps) {
  const { snapshot, draft, updateDraft, strings } = props;
  const styles = useStyles();
  const [editing, setEditing] = useState<EditingModel | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const conflictPort = useMemo(() => {
    if (!editing) {
      return null;
    }
    const port = Number.parseInt(editing.port, 10);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      return null;
    }
    const conflict = draft.localHomepage.services.find((service) =>
      service.port === port && service.id !== editing.id
    );
    return conflict ? port : null;
  }, [draft.localHomepage.services, editing]);

  const statusById = useMemo(() => {
    const map = new Map<string, ServiceRuntimeModel>();
    snapshot.localHomepage.services.forEach((service) => map.set(service.id, service));
    return map;
  }, [snapshot.localHomepage.services]);

  const filteredIconChoices = useMemo(() => {
    const normalized = iconQuery.trim().toLowerCase();
    const choices = editing?.icon && !ICON_CHOICES.includes(editing.icon)
      ? [editing.icon, ...ICON_CHOICES]
      : ICON_CHOICES;
    if (!normalized) {
      return choices.slice(0, 80);
    }
    return choices
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 80);
  }, [editing?.icon, iconQuery]);

  function openCreateDialog() {
    const next = createNewServiceDraft(draft.localHomepage.services.length);
    setEditing(next);
    setIconQuery(next.icon);
  }

  function openEditDialog(service: ServiceModel) {
    const next = toEditingModel(service);
    setEditing(next);
    setIconQuery(next.icon);
  }

  function closeDialog() {
    setEditing(null);
    setIconQuery("");
  }

  function onPresetChange(presetName: string) {
    const preset = findPreset(presetName);
    if (!preset || !editing) {
      return;
    }
    setEditing({
      ...editing,
      presetType: preset.name,
      name: preset.name === "Custom" ? editing.name : preset.name,
      port: String(preset.defaultPort),
      icon: preset.icon,
      description: preset.defaultDescription,
      iconUrl: ""
    });
    setIconQuery(preset.icon);
  }

  function saveEditing() {
    if (!editing) {
      return;
    }
    const parsedPort = Number.parseInt(editing.port, 10);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535 || conflictPort !== null) {
      return;
    }

    const preset = findPreset(editing.presetType);
    const name = editing.name.trim().length > 0
      ? editing.name.trim()
      : preset?.name === "Custom"
        ? `New Server ${draft.localHomepage.services.length + 1}`
        : preset?.name ?? "Custom";
    const icon = editing.iconUrl.trim().length > 0 ? editing.iconUrl.trim() : editing.icon;
    const payload: ServiceModel = {
      id: editing.id ?? createServiceId(),
      name,
      port: parsedPort,
      icon,
      description: editing.description.trim(),
      presetType: editing.presetType
    };

    updateDraft((prev) => {
      const services = [...prev.localHomepage.services];
      const existingIndex = services.findIndex((item) => item.id === payload.id);
      if (existingIndex >= 0) {
        services[existingIndex] = payload;
      } else {
        services.push(payload);
      }
      return {
        ...prev,
        localHomepage: {
          ...prev.localHomepage,
          services
        }
      };
    });
    closeDialog();
  }

  function deleteService(serviceId: string) {
    updateDraft((prev) => ({
      ...prev,
      localHomepage: {
        ...prev.localHomepage,
        services: prev.localHomepage.services.filter((service) => service.id !== serviceId)
      }
    }));
    setPendingDeleteId(null);
  }

  async function copyShareAddress(shareUrl: string) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage(strings.copied);
      setTimeout(() => setCopyMessage(null), 1500);
    } catch {
      setCopyMessage(strings.copyFailed);
      setTimeout(() => setCopyMessage(null), 1500);
    }
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDragOverId(null);
      return;
    }
    updateDraft((prev) => ({
      ...prev,
      localHomepage: {
        ...prev.localHomepage,
        services: reorderServices(prev.localHomepage.services, draggingId, targetId)
      }
    }));
    setDragOverId(null);
  }

  return (
    <Card className={styles.root}>
      <div className={styles.head}>
        <Title3 className={styles.title}>
          <FluentIcon icon="fluent:server-24-regular" width={20} />
          {strings.title}
        </Title3>
        <Text className={styles.hint}>{strings.dragSortHint}</Text>
      </div>
      {copyMessage && <Text>{copyMessage}</Text>}
      <div className={styles.grid}>
        <Card className={`${styles.card} service-manager-card`}>
          <div className={styles.rowBetween}>
            <div className={styles.row}>
              <FluentIcon icon="fluent:globe-24-regular" width={20} />
              <Text weight="semibold">{strings.homepageCardName}</Text>
              <Badge appearance="filled" color="informative">{strings.pinnedLabel}</Badge>
            </div>
          </div>
          <Text>{strings.portLabel}: <strong>{snapshot.localHomepage.webPort}</strong></Text>
          <div className={styles.row}>
            <Text>{strings.statusLabel}:</Text>
            <Badge color={snapshot.localHomepage.running ? "success" : "danger"}>
              {snapshot.localHomepage.running ? strings.online : strings.offline}
            </Badge>
          </div>
          <Text>{strings.homepageCardDescription}</Text>
          <div className={styles.actions}>
            <Button
              className="service-manager-button"
              appearance="subtle"
              icon={<FluentIcon icon="fluent:copy-24-regular" width={16} />}
              onClick={() => copyShareAddress(snapshot.localHomepage.webUrl)}
            >
              {strings.copyShare}
            </Button>
          </div>
        </Card>

        {draft.localHomepage.services.map((service) => {
          const runtime = statusById.get(service.id);
          const shareUrl = runtime?.shareUrl ?? `${snapshot.localHomepage.preferredHost}:${service.port}`;
          return (
            <Card
              key={service.id}
              className={`${styles.card} service-manager-card${draggingId === service.id ? " is-dragging" : ""}${dragOverId === service.id ? " is-drop-target" : ""}`}
              draggable
              onDragStart={(event) => {
                setDraggingId(service.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", service.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragEnter={() => setDragOverId(service.id)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverId(service.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(service.id);
              }}
            >
              <div className={styles.rowBetween}>
                <div className={styles.row}>
                  <FluentIcon icon={service.icon} width={20} />
                  <Text weight="semibold">{service.name}</Text>
                </div>
                <span className={styles.dragHandle}>
                  <FluentIcon icon="fluent:re-order-dots-vertical-24-regular" width={16} />
                </span>
              </div>
              <Text>{strings.portLabel}: <strong>{service.port}</strong></Text>
              <div className={styles.row}>
                <Text>{strings.statusLabel}:</Text>
                <Badge color={runtime?.isOnline ? "success" : "danger"}>
                  {runtime?.isOnline ? strings.online : strings.offline}
                </Badge>
              </div>
              <Text>{service.description || strings.noDescription}</Text>
              <div className={styles.actions}>
                <Button
                  className="service-manager-button"
                  appearance="secondary"
                  icon={<FluentIcon icon="fluent:edit-24-regular" width={16} />}
                  onClick={() => openEditDialog(service)}
                >
                  {strings.edit}
                </Button>
                <Button
                  className="service-manager-button"
                  appearance={pendingDeleteId === service.id ? "primary" : "subtle"}
                  icon={<FluentIcon icon="fluent:delete-24-regular" width={16} />}
                  onClick={() => {
                    if (pendingDeleteId === service.id) {
                      deleteService(service.id);
                    } else {
                      setPendingDeleteId(service.id);
                    }
                  }}
                >
                  {pendingDeleteId === service.id ? strings.confirmDelete : strings.delete}
                </Button>
                <Button
                  className="service-manager-button"
                  appearance="subtle"
                  icon={<FluentIcon icon="fluent:copy-24-regular" width={16} />}
                  onClick={() => copyShareAddress(shareUrl)}
                >
                  {strings.copyShare}
                </Button>
              </div>
            </Card>
          );
        })}

        <Card className={styles.addCard}>
          <Button
            className="service-manager-button"
            appearance="secondary"
            icon={<FluentIcon icon="fluent:add-circle-24-regular" width={20} />}
            onClick={openCreateDialog}
          >
            {strings.addService}
          </Button>
        </Card>
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(_, data) => {
          if (!data.open) {
            closeDialog();
          }
        }}
      >
        <DialogSurface className="service-manager-dialog">
          <DialogBody>
            <DialogTitle>{editing?.id ? strings.editDialogTitle : strings.addDialogTitle}</DialogTitle>
            <DialogContent>
              {editing && (
                <div className={styles.root}>
                  <Field label={strings.presetLabel}>
                    <Combobox
                      value={editing.presetType}
                      selectedOptions={[editing.presetType]}
                      onOptionSelect={(_, data) => {
                        if (data.optionValue) {
                          onPresetChange(String(data.optionValue));
                        }
                      }}
                    >
                      {SERVICE_PRESETS.map((preset) => (
                        <Option
                          key={preset.name}
                          value={preset.name}
                          text={preset.name}
                        >
                          <span className={styles.optionRow}>
                            <FluentIcon icon={preset.icon} width={16} />
                            {preset.name}
                          </span>
                        </Option>
                      ))}
                    </Combobox>
                  </Field>

                  <Field label={strings.nameLabel}>
                    <Input
                      value={editing.name}
                      onChange={(_, data) => setEditing({ ...editing, name: data.value })}
                    />
                  </Field>

                  <Field label={strings.portLabel}>
                    <Input
                      type="number"
                      value={editing.port}
                      onChange={(_, data) => setEditing({ ...editing, port: data.value })}
                    />
                  </Field>
                  {conflictPort !== null && (
                    <Text className={styles.warning}>
                      {strings.portConflict.replace("{port}", String(conflictPort))}
                    </Text>
                  )}

                  <Field label={strings.iconPresetLabel}>
                    <Combobox
                      freeform
                      placeholder={strings.iconSearchPlaceholder}
                      value={iconQuery}
                      selectedOptions={filteredIconChoices.includes(editing.icon) ? [editing.icon] : []}
                      onChange={(event) => {
                        const value = (event.target as HTMLInputElement).value;
                        setIconQuery(value);
                        setEditing({ ...editing, icon: value.trim(), iconUrl: "" });
                      }}
                      onOptionSelect={(_, data) => {
                        if (data.optionValue) {
                          const value = String(data.optionValue);
                          setIconQuery(value);
                          setEditing({ ...editing, icon: value, iconUrl: "" });
                        }
                      }}
                    >
                      {filteredIconChoices.map((iconValue) => (
                        <Option
                          key={iconValue}
                          value={iconValue}
                          text={iconValue}
                        >
                          <span className={styles.optionRow}>
                            <FluentIcon icon={iconValue} width={16} />
                            {iconValue}
                          </span>
                        </Option>
                      ))}
                    </Combobox>
                  </Field>
                  {filteredIconChoices.length === 0 && (
                    <Text>{strings.iconSearchNoResult}</Text>
                  )}
                  <div className={styles.row}>
                    <Text>{strings.iconPreviewLabel}:</Text>
                    <FluentIcon icon={editing.icon || "fluent:question-circle-24-regular"} width={18} />
                    <Text>{editing.icon || "-"}</Text>
                  </div>

                  <Field label={strings.iconUrlLabel}>
                    <Input
                      value={editing.iconUrl}
                      placeholder="https://..."
                      onChange={(_, data) => setEditing({ ...editing, iconUrl: data.value })}
                    />
                  </Field>

                  <Field label={strings.descriptionLabel}>
                    <Input
                      value={editing.description}
                      onChange={(_, data) => setEditing({ ...editing, description: data.value })}
                    />
                  </Field>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button className="service-manager-button" appearance="subtle">{strings.cancel}</Button>
              </DialogTrigger>
              <Button
                className="service-manager-button"
                appearance="primary"
                onClick={saveEditing}
              >
                {strings.save}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Card>
  );
}
