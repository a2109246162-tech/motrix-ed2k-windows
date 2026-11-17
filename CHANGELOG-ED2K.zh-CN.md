# ED2K 版 — 变更清单（简体中文）

[English](./CHANGELOG-ED2K.md)

基线：上游 Motrix v2.4.2（`c601dcf`），叠加 `motrix-macos12` 的 macOS 12 兼容补丁。

## 改动内容

| 区域 | 文件 | 具体改动 |
| --- | --- | --- |
| ED2K 解析 | `src/shared/lib/ed2k-link.ts`（新增） | 严格解析 eD2k file/server/serverlist 链接，给出精确诊断。 |
| 解析测试 | `src/shared/lib/ed2k-link.test.ts`（新增） | 17 个测试，覆盖合法格式与错误输入。 |
| 源分析 | `src/shared/lib/download-source.ts`、`src/shared/schemas/download-source.ts` | 加入 `ed2k` 协议与诊断；`analyzeDownloadSource` 增加 ED2K 分支。 |
| 准入 | `src/core/task/source-admission.ts`（及 `.test.ts`） | 默认白名单和 `admitTaskCreateRequest` 加入 `ed2k`；新增测试断言 ED2K 请求被接受。 |
| 任务创建 | `src/core/task/create-task-handler.ts` | input 白名单和两处 plugin 钩子白名单加入 `ed2k`。 |
| 恢复 | `src/core/task/actions/re-add-task.ts`、`src/core/session/session-manager.ts` | recovery 白名单加入 `ed2k`。 |
| 插件钩子 | `src/core/plugin/hooks/hook-orchestrator.ts` | plugin 白名单加入 `ed2k`。 |
| 引擎 | `ed2k-engine/aria2c-wrapper.sh`、`ed2k-engine/install-engine.sh` | 用 aria2-next 3.1.0 替换 aria2；过滤 SQLite 参数；规范化 `--version`；加载 `server.met` / `nodes.dat`；加入活跃服务器；开启 16 分块与 200 ED2K 连接。 |
| 网络引导 | `ed2k-engine/server.met`、`nodes.dat`、`servers.json` | 来自 upd.emule-security.org 与 Telemacore 的 eD2k 服务器/Kad 列表。 |
| 安装包 | DMG 内的 `app.asar` | 把同样的 ED2K 逻辑注入编译后的主进程/渲染进程；处理压缩代码差异（`dv` 与 `Tt`、`n=[...]` 与 `t=[...]`、`ba([...])` 枚举）。 |
| 文档 | README 中英版、本变更清单中英版、Windows 改法/提示词中英版、`ATTRIBUTION.md`、`THIRD_PARTY_NOTICES.md` | 只描述已验证行为和限制。 |

## 验证

- 64 个 ED2K 相关测试通过；`tsc --noEmit` 与 Biome 通过。
- macOS 12.7.6：应用和引擎正常启动；RPC 观测 `serverCount=28`、`connectedServerCount=1`、`kadNodeCount≈75`。
- 用户提供的 Office ISO 链接只作为格式测试样例；干跑结果 `CN:0`（无在线源），未下载该文件。

## 已知限制

- 实际传输速度完全取决于该 hash 当前是否有在线源。`CN:0` 时任何客户端都会是 0 B/s。
- 随包 `aria2-next` 为 GPL-2.0；MIT 仅适用于 Motrix 源码及本分支补丁。
- macOS 12 上登录项注册不可用（继承自基础兼容补丁）。

## 冷门资源诊断

- 新增 `ed2k-engine/source-lookup.py`，查询历史 eD2k 可用源并输出对应 `ip:port` 服务器。
- 把之前 hash 对应的 `eMule Sunrise`、`Astra-3`、`MO-ad-free` 加入包装脚本。
- 因 UPnP 返回 501，包装脚本关闭 UPnP；文档说明需在路由器手动转发端口。

## 每任务分享

- 新增 `src/core/task/ed2k-sharing.ts`：每任务比例存储，以及每 10 秒读取 aria2-next `uploadLength` 的监控器。
- 新增 `command:setEd2kShareRatio` IPC 命令，并在 ED2K 任务右键菜单加入 **ED2K 分享比例** 子菜单。
- 可选：不限、0（完成后停止上传）、1、1.5、2、3、5。达到目标后移除引擎任务，文件保留。

## 分享交互与引擎识别最终版

- 新增 `engine.ed2kShareBandwidth` 设置（默认开启）和设置页开关。
- 每任务滑轨 0–10（步长 0.1），预设 0.5/1/2/10/不限；默认 0.5。
- 监控器先判断总开关，再按每任务比例作用于所有 ED2K 任务。
- 识别 `aria2-next` / `3.1.0-motrix-ed2k` 为受支持引擎，消除误报的非 Motrix aria2 提示和 16 连接上限。

## 速度诊断

- 新增 `ed2k-engine/diagnose.py`，通过 RPC 实时查看 LowID、服务器/Kad 数量、端口映射和每任务 peer 数。
- 文档记录了本机实测：LowID、Kad 被防火墙隔离、UPnP 关闭、仅连 1 台服务器、暂停任务 0 个 peer。

## 仪表盘贡献

- 分享监控器新增 `ed2k-contribution.json`：按天、按任务记录上传增量，保留 90 天。
- 新增 `query:getEd2kContribution` 和明细弹窗，从传输卡片点击进入。
- 传输卡片现在始终显示 **ED2K 已贡献**，总流量为 0 时也显示。

## 输出名称与最终化修复

- ED2K 链接不再走 `new URL()`。`ed2kLinkFilename()` 从链接中提取文件名并做百分号解码，任务名会是 `deepin-...iso`，不再是 `download`。
- HTTP 创建链路用这个名称生成 `out`、`.motrix` 临时文件和最终重命名。
- `removeDownloadResult` 现在同时接受 aria2-next 不带井号的错误文本（`GID <gid>` 和 `GID#<gid>`）。不修的话，下载完成后会卡在 `.motrix`，报 "Could not remove download result"。
- 端到端实测：3.3 MB 的 ED2K PDF 完成并最终化为 `[Wiley] Ubuntu Linux Toolbox ....pdf`，`file` 识别为 `PDF document, version 1.6`。

- 任务详情里的类型现在显示为 `ED2K`，不再显示内部传输类型 `HTTP`。

---

## Windows 版移植（本分支相对 macOS ED2K 版的改动）

本分支把 macOS ED2K 版移植到 Windows。ED2K 的识别、下载、分享、贡献统计逻辑与 macOS 版完全一致；以下只列平台相关的新增改动。

| 区域 | 文件 | 改动 | 原因 |
| --- | --- | --- | --- |
| 引擎引导注入 | `src/core/engine/aria2/ed2k-engine-bootstrap.ts`（新增） | 识别 `aria2-next`，生成 `server.met` / `nodes.dat` / 活跃服务器 / 多线程覆盖参数 | Windows 无法用 Node 直接启动 `.cmd`/`.sh` 包装脚本，改在应用层注入 |
| 引擎参数 | `src/core/engine/aria2/aria2-config-builder.ts` | 构造函数新增 `ed2kBootstrapDir` 选项；`buildArgs()` 末尾追加 ED2K 参数 | 用 aria2「取最后一次选项」的语义覆盖默认 `--min-split-size=4194304` |
| 引擎启动 | `src/core/engine/engine-supervisor.ts` | 把 `featureReport.version` 传给 `buildArgs()` | 让引导逻辑只在识别到 aria2-next 时生效，普通 aria2 不受影响 |
| 主进程/服务端 | `src/main/index.ts`、`src/server/index.ts` | 构造 ConfigBuilder 时传入 `extra/ed2k` 数据目录 | 打包后仍能定位 server.met / nodes.dat |
| 引导数据 | `extra/ed2k/server.met`、`extra/ed2k/nodes.dat`（新增） | 从 `ed2k-engine/` 复制到运行时数据目录 | 随包分发服务器与 Kad 引导列表 |
| 打包配置 | `electron-builder.json` | `extraResources` 加入 `./extra/ed2k/` | 让引导数据进入安装包 |
| 测试 | `src/core/engine/aria2/ed2k-engine-bootstrap.test.ts`（新增） | 覆盖 aria2-next 识别、参数生成、普通 aria2 无操作 | 保证注入逻辑正确 |
| 文档 | `README.md` / `README.zh-CN.md`、本变更清单 | 改为 Windows 版说明，中文为主 | 与姊妹版保持一致的写法 |

### 与 macOS 版的关键差异

- **引导参数注入点**：macOS 用 `ed2k-engine/aria2c-wrapper.sh` 拦截 `aria2c` 启动参数；Windows 在 `Aria2ConfigBuilder.buildArgs()` 末尾追加。两者参数完全一致，都追加在最后以覆盖默认值。
- **引擎二进制**：Windows 用 `aria2-next-3.1.0-windows-x86_64.exe`，放到 `extra/win32/x64/aria2c.exe`（GPL-2.0）。
- **SQLite 参数**：Windows 不走 wrapper 过滤，而是靠源码已有逻辑——`aria2-next` 不上报 `SQLite3-Persistence` token，`hasSqlitePersistence=false`，三个 SQLite 参数由 `buildArgs()` 自动跳过。

### 验证

- ED2K 识别、准入、分享相关源码补丁与 macOS 版同源，单元测试一并保留。
- 引擎引导注入有独立测试：识别 aria2-next 才注入、普通 aria2 返回空参数、缺少数据目录时安全降级。
