# Motrix 2.4.2 — macOS 12 + ED2K 版

本仓库基于 [agalwood/Motrix](https://github.com/agalwood/Motrix) v2.4.2（MIT License）。作者：Dr_rOot / agalwood。

它在 `motrix-macos12`（纯 macOS 12 兼容版）的基础上，增加了 **ED2K 识别与实际下载能力**。

## 与原版/上一版的区别

| 项目 | 原版 2.4.2 | motrix-macos12 | 本版（motrix-ed2k） |
| --- | --- | --- | --- |
| macOS 12 运行 | 否 | 是 | 是 |
| ED2K 链接识别 | 否（报 unsupportedProtocol） | 否 | 是 |
| ED2K 实际下载 | 否 | 否 | 是（通过 aria2-next 引擎） |
| 内置引擎 | aria2 1.37.0-motrix | aria2 1.37.0-motrix | aria2-next 3.1.0 |

## 功能说明

- 识别并校验 ED2K 文件链接、带 sources 的文件链接、server 与 serverlist 链接。
- 非法链接给出精确错误原因和字符范围，例如 31 位哈希会被定位为 `invalidEd2kHash`。
- 用 `aria2-next` 替换内置 aria2：`aria2-next` 原生支持 eD2k（server/Kad、peer 传输、断点续传），并保留 aria2 CLI/JSON-RPC 接口。
- Motrix 的 HTTP/HTTPS/FTP/BT/Magnet 行为保持不变。

## 使用说明

1. 安装 `Motrix-2.4.2-ed2k-macos12-x64.dmg`。
2. 首次打开如被 Gatekeeper 拦截，右键 →「打开」。
3. 在"新建任务 → 链接"中粘贴 `ed2k://|file|...` 链接即可。
4. 不要使用应用内自动更新，更新会覆盖补丁。

从源码构建/验证：

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm exec vitest run src/shared/lib/ed2k-link.test.ts src/shared/lib/download-source.test.ts
```

## 修复原因

原版 `analyzeDownloadSource()` 只放行 `http/https/ftp/magnet`，`ed2k` 在协议白名单阶段就被拒绝；而内置 aria2 上游明确不支持 eD2k（见 aria2/aria2#603、Motrix#553）。因此"识别"和"下载"两层都需要改：

1. 新增 `src/shared/lib/ed2k-link.ts`，严格解析 eD2k 语法。
2. 将 `ed2k` 加入协议枚举和默认白名单，并在 `analyzeDownloadSource()` 中增加 ED2K 分支。
3. 用 `aria2-next` 替换下载引擎；`ed2k-engine/aria2c-wrapper.sh` 过滤 Motrix 传给原 aria2 但 aria2-next 不支持的 SQLite 参数，并在 `--version` 时输出 Motrix 可识别的版本字符串。

## 验证结果

- 单元测试：64 个 ED2K 相关测试通过（含你提供的 Office 链接作为**格式样例**，不下载）。
- 引擎验证：aria2-next 3.1.0 接受 Motrix 的启动参数（过滤 SQLite 参数后），RPC 正常启动；合成 ED2K 链接干跑成功进入 eD2k 传输状态。
- 网络验证：加载 `server.met` / `nodes.dat` 后，`serverCount=28`、`connectedServerCount=1`、`kadNodeCount≈75`。
- 多线程：包装脚本强制覆盖 `--split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200`。
- 你提供的 Office 链接干跑结果 `CN:0`，说明当前 eD2k 网络没有该 hash 的在线源，因此显示 0B/s；这属于网络现象，不是识别或引擎故障。
- macOS 12.7.6 实机：应用启动，引擎就绪，aria2-next 进程运行，无新增错误日志。

## 许可证

- Motrix 原项目与 ED2K 解析补丁：MIT License（见 `LICENSE`、`ATTRIBUTION.md`）。
- 内置下载引擎 `aria2-next` 为 GPL-2.0；见 `THIRD_PARTY_NOTICES.md`。因此发布的 DMG 中该引擎二进制按 GPL-2.0 提供源码获取方式。
