# Cloudflare IPv6 DDNS（Tauri 桌面版）

一个托盘优先的桌面应用：将本机当前可用的全局 IPv6 自动同步到 Cloudflare AAAA 记录，并提供内置本机主页用于服务分享。

> [!IMPORTANT]
> 警告：本仓库代码主要由 AI 生成，请在使用前自行完成代码审查、安全评估与功能验证。

> [!IMPORTANT]
> 平台支持声明：作者仅在 Windows 上测试并保证可正常使用，macOS 和 Linux 不保证可用性。

## 功能特性

- DDNS 范围仅为 IPv6（仅 AAAA 记录），不会执行 IPv4（A 记录）更新。
- 代码中存在 IPv4 逻辑，但仅用于本机主页运行时（监听/探测/地址展示兜底），不参与 DNS 推送。
- 自动检测并跟踪本机全局 IPv6
- Cloudflare AAAA 同步：
  - 手动推送
  - IPv6 变化时自动推送
  - 支持通过 `zone_id + domain` 自动查询 AAAA `record_id`
- API Token 使用系统安全凭据存储（不写入配置文件）
- 支持网卡选择（控制 IPv6 来源优先级）
- 托盘运行能力：
  - 打开主窗口
  - 手动更新
  - 切换自动更新
  - 退出程序
- 轻量模式：
  - 默认启动隐藏主窗口
  - 关闭主窗口后后台与托盘继续运行
- 本机主页系统：
  - 内置 HTTP 服务（`/index.html`）
  - 服务管理（添加/编辑/删除服务卡片）
  - 按端口实时检测服务在线状态
  - 支持复制分享地址
- 界面语言：英文 / 简体中文 / 跟随系统
- 主题模式：浅色 / 深色 / 跟随系统

## 技术栈

- Tauri v2
- Rust + Tokio + Axum
- React 19 + TypeScript
- Fluent UI v9
- Vite

## 环境要求

- Node.js
- `pnpm`（项目使用 `pnpm@10.2.1`）
- Rust stable 工具链
- Tauri v2 平台依赖  
  https://tauri.app/start/prerequisites/

## 开发运行

安装依赖：

```bash
pnpm install
```

运行桌面应用：

```bash
pnpm dev
```

仅运行 Web 界面：

```bash
pnpm web:dev
```

构建前端：

```bash
pnpm build
```

构建桌面安装包：

```bash
pnpm tauri:build
```

类型检查：

```bash
pnpm lint
```

## DDNS 快速配置

1. 打开 `DDNS` 标签页。
2. 填写 `Zone ID` 和 `Domain`（AAAA 记录名）。
3. 保存 API Token。
4. 点击 `查询 AAAA 记录 ID`（推荐）。
5. 点击 `保存 Cloudflare 设置`。
6. 点击 `立即推送更新` 完成首次同步。
7. 保持 `自动推送更新` 开启以持续同步。

## 运行行为

- 单实例运行。
- 默认轻量启动（托盘优先）。
- 关闭主窗口会立即进入轻量模式。
- 只有在托盘菜单点击 `退出` 才会结束进程。
- 后端通过各平台网络变化监听器触发检测流程。

## 本机主页

内置服务路由：

- `/` -> 重定向到 `/index.html`
- `/index.html`
- `/assets/*`
- `/api/homepage/snapshot`

端口行为：

- 配置默认端口：`8080`
- 若绑定失败：回退到 `8081`

分享地址主机优先级：

1. 已配置的 Cloudflare 域名
2. 出口 IPv4
3. 当前 IPv6
4. `127.0.0.1`

说明：这里的“出口 IPv4”仅用于本机主页/分享地址展示兜底，不参与 Cloudflare DDNS 更新逻辑。

## 存储与安全

- 配置文件：Tauri 应用配置目录下的 `settings.json`
- API Token：通过 `keyring` 写入系统安全凭据存储
- 配置中持久化运行缓存：
  - 最近 IPv6
  - 最近 IPv6 变化时间
  - 最近同步时间与状态

## 项目结构

- `src/`：React 界面（`index.html` 主界面 + `homepage.html` 本机主页入口源码）
- `src-tauri/src/`：Rust 后端（DDNS、托盘、网络监听、本机主页服务）
- `src-tauri/tauri.conf.json`：Tauri 应用配置
