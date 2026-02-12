# Cloudflare IPv6 DDNS (Tauri Desktop)

Tray-first desktop app that keeps a Cloudflare AAAA record synced with your current local global IPv6, and also provides a built-in local homepage for service sharing.

如需查看中文文档，请点击：[README_zh.md](./README_zh.md)

> [!IMPORTANT]
> Warning: this repository is primarily AI-generated. Please perform your own code review, security assessment, and functional verification before use.

> [!IMPORTANT]
> Platform support statement: the author only tests and guarantees normal usability on Windows. macOS and Linux availability is not guaranteed.

## Features

- DDNS scope: IPv6 only (AAAA only). No A-record/IPv4 update behavior.
- IPv4 exists in code only for local homepage runtime (bind/check/display fallback), not for DNS push.
- Auto detect and track current global IPv6 from local interfaces
- Cloudflare AAAA sync:
  - Manual push
  - Auto push on IPv6 change
  - AAAA `record_id` lookup from `zone_id + domain`
- API token stored in OS secure keyring (not in config file)
- Interface selection for IPv6 source preference
- Tray runtime controls:
  - Show main window
  - Manual update
  - Toggle auto update
  - Quit
- Lightweight mode:
  - App starts hidden by default
  - Closing main window keeps backend + tray alive
- Local homepage system:
  - Embedded HTTP server (`/index.html`)
  - Service manager (add/edit/delete service cards)
  - Per-service online/offline check by local port probing
  - Share URL copy support
- UI localization: English / Simplified Chinese / Follow system
- Theme: Light / Dark / Follow system

## Tech Stack

- Tauri v2
- Rust + Tokio + Axum
- React 19 + TypeScript
- Fluent UI v9
- Vite

## Prerequisites

- Node.js
- `pnpm` (project uses `pnpm@10.2.1`)
- Rust stable toolchain
- Tauri v2 platform dependencies  
  https://tauri.app/start/prerequisites/

## Development

Install dependencies:

```bash
pnpm install
```

Run desktop app:

```bash
pnpm dev
```

Run web UI only:

```bash
pnpm web:dev
```

Build frontend:

```bash
pnpm build
```

Build desktop bundle:

```bash
pnpm tauri:build
```

Type check:

```bash
pnpm lint
```

## Quick Setup (DDNS)

1. Open `DDNS` tab.
2. Fill `Zone ID` and `Domain` (AAAA record name).
3. Save API token.
4. Click `Lookup AAAA record ID` (recommended).
5. Click `Save Cloudflare Settings`.
6. Click `Push update now` for first sync.
7. Keep `Auto push updates` enabled for ongoing sync.

## Runtime Behavior

- Single instance app.
- Startup is lightweight by design (tray-first).
- Closing the main window enters lightweight mode immediately.
- Process stays alive until `Quit` is selected in tray menu.
- Network changes are watched with platform-specific watchers.

## Local Homepage

Embedded server routes:

- `/` -> redirect to `/index.html`
- `/index.html`
- `/assets/*`
- `/api/homepage/snapshot`

Port behavior:

- Config default: `8080`
- If bind fails, fallback to `8081`

Preferred share host selection order:

1. Configured Cloudflare domain
2. Outbound IPv4
3. Current IPv6
4. `127.0.0.1`

Note: the outbound IPv4 above is only used for local homepage/share URL display fallback, not for Cloudflare DDNS update logic.

## Storage and Security

- Config file: `settings.json` under Tauri app config directory
- API token: OS secure credential store via `keyring`
- Runtime cache persisted in config:
  - last known IPv6
  - last IPv6 change time
  - last sync time and status

## Project Structure

- `src/`: React UI (`index.html` main UI + `homepage.html` local-homepage entry source)
- `src-tauri/src/`: Rust backend (DDNS, tray, network watch, local homepage server)
- `src-tauri/tauri.conf.json`: Tauri app config
