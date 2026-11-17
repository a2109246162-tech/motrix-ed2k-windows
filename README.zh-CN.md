<div align="center">

<img src="./public/app-icon.png" alt="Motrix ED2K for Windows" width="128" />

# Motrix 2.4.2 · ED2K 版（Windows）

**让 Windows 上的 Motrix 真正支持 ED2K：识别链接、用 aria2-next 下载，并按任务回馈分享。**

[![平台](https://img.shields.io/badge/平台-Windows%2010%2F11-blue.svg)](#系统要求)
[![基线](https://img.shields.io/badge/基线-Motrix%202.4.2-lightgrey.svg)](https://github.com/agalwood/Motrix)
[![引擎](https://img.shields.io/badge/引擎-aria2--next%203.1.0-orange.svg)](./ed2k-engine)
[![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)](./LICENSE)

简体中文 | [English](./README.md)

</div>

---

## 这是一个什么版本

本项目基于 [agalwood/Motrix](https://github.com/agalwood/Motrix) v2.4.2，保留 Motrix 原有的桌面体验，补上上游一直没有提供的两件事：**ED2K 链接准入** 和 **真正会说 eD2k 的下载引擎**。

它与同作者的 [macOS ED2K 版](https://github.com/a2109246162-tech/motrix-ed2k) 是姊妹版：ED2K 逻辑完全一致，区别只在平台相关的引擎接入方式。macOS 用 shell 包装脚本注入 eD2k 引导参数；Windows 不能用 Node 直接启动 `.cmd`/`.sh`，因此改为在应用层（`Aria2ConfigBuilder`）注入同样的参数。

> 这是独立的社区分支，与 Motrix 上游、Microsoft、迅雷均无隶属关系。

| 版本 | ED2K | 适用 |
| --- | --- | --- |
| 上游 Motrix 2.4.2 | ❌（报 unsupportedProtocol） | 只需要 HTTP/BT/磁力 |
| 本版（Windows ED2K） | ✅ | Windows 上需要 ED2K 下载、分享、贡献统计 |

## 功能

| 功能 | 状态 |
| --- | --- |
| ED2K 文件、服务器、服务器列表链接 | 通过 Motrix 各层准入并解析 |
| ED2K 引擎 | 内置 `aria2-next 3.1.0`（Windows x64），原生支持 eD2k/Kad |
| 服务器与 Kad 引导 | `server.met` + `nodes.dat`，附带活跃服务器列表 |
| 多线程传输 | 16 分块、200 个 eD2k 连接、最小分块 1 MiB |
| 原文件名 | 从链接提取并百分号解码，保留扩展名 |
| 每任务分享比例 | 右键任务，用滑轨选择 0–10 倍文件大小 |
| 全局分享开关 | 设置 → BitTorrent → ED2K 分享 |
| 贡献统计面板 | 累计、按天拆分、每天贡献最多的任务 |
| HTTP / HTTPS / FTP / BT / Magnet | 保留上游能力 |

## 系统要求

- Windows 10 或 11（x64）
- 允许 eD2k 流量出站的网络
- 想要更好的 peer 连接：路由器上可达的 TCP/UDP 端口

## 安装

1. 从 [Releases](../../releases) 下载 Windows 版压缩包或安装包。
2. 压缩包版解压后运行 `Motrix.exe`；安装包版按向导安装。
3. 如被 SmartScreen 拦截，选择「更多信息」→「仍要运行」。

> 内置引擎 `aria2-next` 为 GPL-2.0；请勿开启应用内自动更新，否则会把打过补丁的引擎替换回原版。

## 使用

### 下载 ED2K 文件

把 `ed2k://|file|...|/` 链接粘贴到 **新建任务 → 链接**。应用会校验哈希与大小、接受任务并交给 aria2-next。

文件名来自链接本身（不经过 `new URL()`，因为 ED2K 链接不是 URL），下载中保存为 `<原名>.motrix`，完成后校验并改回原名，扩展名不丢。

### 回馈分享

打开 **设置 → BitTorrent → ED2K 分享**，保持 **为 ED2K 资源提供带宽** 开启。然后右键任意 ED2K 任务：

- 滑轨 **0**：下载完成后停止上传
- 滑轨 **0.5**：默认值，上传下载量的 50%
- 滑轨 **1–10**：上传文件大小的 1 到 10 倍
- **不限**：不设比例上限，一直做种

监控器每 10 秒检查一次，达标后移除引擎任务，但**不删除已下载文件**。

## 速度与源

eD2k 是点对点网络。速度取决于**实时在线源**、对方上传带宽，以及你的客户端是否可达。迅雷的高速度来自它自己的中心缓存和 CDN，公开 eD2k 客户端无法复刻。

应用运行时可直接运行内置诊断：

```bat
python ed2k-engine\diagnose.py
```

它会打印已连服务器、是否 LowID、Kad 节点、端口映射和每任务 peer 数。若某任务长时间 `0 peers`，说明该 hash 没有在线源，这是网络状况，不是代码问题。

要提高拿到 HighID 的概率，在路由器把 **TCP 4662**、**UDP 4672** 转发到本机局域网地址。测试路由器 UPnP 返回 501，因此自动映射已关闭。

## 仪表盘贡献

仪表盘传输卡片会显示 **ED2K 已贡献 · 详情**，即使总量为 0 B 也会显示。点击打开明细弹窗：累计贡献、按天拆分、每天贡献最多的任务。计数由执行分享比例的同一个 10 秒监控器更新，保存在用户数据目录的 `ed2k-contribution.json`，保留 90 天。

## 从源码构建

```bash
corepack pnpm install --frozen-lockfile

# 类型检查与聚焦测试
corepack pnpm exec tsc --noEmit
corepack pnpm exec vitest run \
  src/shared/lib/ed2k-link.test.ts \
  src/shared/lib/download-source.test.ts \
  src/core/task/source-admission.test.ts \
  src/core/task/ed2k-sharing.test.ts \
  src/core/engine/aria2/feature-report.test.ts \
  src/core/engine/aria2/ed2k-engine-bootstrap.test.ts

# 构建并打包 Windows x64
corepack pnpm run build
corepack pnpm run stage:electron -- --platform win32 --arch x64
```

引擎相关文件在 `ed2k-engine/` 与打包进 `extra/ed2k/`；说明见 [`ed2k-engine/README.md`](./ed2k-engine/README.md)。

## 工作原理

本分支没有重新实现 eD2k。它做的是：移除 Motrix 各层协议白名单阻塞、内置原生 eD2k 引擎、启动时注入服务器/Kad 引导数据，并在应用层实现分享与贡献统计。

Windows 与 macOS 唯一的机制差异是**引导参数注入点**：macOS 用 `aria2c-wrapper.sh` 拦截启动参数，Windows 在 `Aria2ConfigBuilder.buildArgs()` 末尾追加（aria2 取最后一次出现的选项，因此覆盖默认值）。两套逻辑等价，识别到 `aria2-next` 才生效，普通 aria2 完全不受影响。

## 已知限制

- eD2k 速度不会超过可用在线源；冷门 hash 在任何开源客户端里都可能是 0 B/s。
- LowID 会限制入站连接；HighID 通常需要在路由器手动转发端口。
- 随包 `aria2-next` 为 GPL-2.0；Motrix 源码与本分支补丁为 MIT。
- 构建为 ad-hoc 签名，未做代码签名/公证。

## 致谢与许可证

- 上游：[agalwood/Motrix](https://github.com/agalwood/Motrix)，MIT。
- 姊妹版：[motrix-ed2k（macOS）](https://github.com/a2109246162-tech/motrix-ed2k)。
- eD2k 引擎：[aria2-next](https://github.com/AnInsomniacy/aria2-next)，GPL-2.0。
- 服务器/Kad 数据：`upd.emule-security.org` 与 Telemacore 活跃服务器列表。

见 [`LICENSE`](./LICENSE)、[`ATTRIBUTION.md`](./ATTRIBUTION.md)、[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。本分支相对上游的逐项改动见 [`CHANGELOG-ED2K.zh-CN.md`](./CHANGELOG-ED2K.zh-CN.md)。
