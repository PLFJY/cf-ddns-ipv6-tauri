import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppSnapshot, LookupRecordIdRequest, SaveSettingsRequest } from "./types";

export const SNAPSHOT_EVENT = "ddns://snapshot";
export const NETWORK_CHANGED_EVENT = "ddns://network-changed";

export async function getSnapshot(): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("get_snapshot");
}

export async function saveSettings(request: SaveSettingsRequest): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("save_settings", { request });
}

export async function pushNow(): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("manual_push_now");
}

export async function lookupRecordId(request: LookupRecordIdRequest): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("lookup_record_id", { request });
}

export async function subscribeSnapshot(
  onSnapshot: (snapshot: AppSnapshot) => void
): Promise<() => void> {
  const unlisten = await listen<AppSnapshot>(SNAPSHOT_EVENT, (event) => {
    onSnapshot(event.payload);
  });
  return unlisten;
}

export async function subscribeNetworkChanged(onChanged: () => void): Promise<() => void> {
  const unlisten = await listen(NETWORK_CHANGED_EVENT, () => {
    onChanged();
  });
  return unlisten;
}
