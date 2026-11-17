# Windows 版本移植提示词（简体中文，供 DeepSeek-V4.1-Flash 使用）

[English](./PROMPTS_FOR_WINDOWS.md)

目标：在 Windows 版 Motrix 2.4.2 上实现与 macOS 版相同的 ED2K「识别 + 下载」能力，并保留原有 HTTP/HTTPS/FTP/BT/Magnet 功能。

## 提示词 1：语义与范围

```text
你在维护一个基于 agalwood/Motrix v2.4.2 的 Windows 分支。请不要修改上游代码风格、缩进、命名约定或注释语言；只做最小必要改动，并为每个改动写中文注释说明原因。目标是：ED2K 链接能被新建任务窗口正确识别为合法输入，并且能真正下载。不要只改 UI 校验而不换引擎。
```

## 提示词 2：识别层

```text
参考 src/shared/lib/ed2k-link.ts 和 src/shared/lib/ed2k-link.test.ts，把 ED2K 解析逻辑移植到当前分支。要求：
1. 支持 ed2k://|file|name|size|32位hex|/ 及带 sources 的形式。
2. 哈希必须严格 32 位十六进制，错误时返回带字符范围的 invalidEd2k 诊断。
3. 把 ed2k 加入 sourceProtocolSchema、analyzeDownloadSource 默认协议白名单和 source-admission 默认协议列表。
4. 补充/运行 vitest 测试，覆盖合法格式、31 位哈希、非十六进制哈希、错误结构。
```

## 提示词 3：引擎层（关键）

```text
原版 Motrix 内置 aria2 不支持 ED2K。请按 ed2k-engine/install-engine.sh 和 aria2c-wrapper.sh 的思路，把 Windows 内置引擎替换为 aria2-next 3.1.0 的 Windows x64 预编译包：
1. 从 https://github.com/AnInsomniacy/aria2-next/releases/tag/v3.1.0 下载 aria2-next-3.1.0-windows-x86_64.exe。
2. 保留 Motrix 原有的 aria2c 文件名，用包装脚本转发参数到 aria2-next.exe。
3. 过滤 --enable-sqlite3-persistence、--sqlite3-db-path、--sqlite3-history-limit 这三个 aria2-next 不支持的参数。
4. --version 时输出 aria2 version 3.1.0-motrix-ed2k，避免 Motrix 版本检测失败。
5. 用 PowerShell/CMD 启动验证：引擎就绪、RPC 端口正常、无 unknown option 报错。
```

## 提示词 4：回归与交付

```text
完成修改后：
1. 运行 pnpm vitest run src/shared/lib/ed2k-link.test.ts src/shared/lib/download-source.test.ts，确认全部通过。
2. 用一个无版权风险的合成 ED2K 链接（例如 1234 字节、32 位测试哈希）做 dry-run 验证，不要下载任何 Windows/Office 镜像。
3. 更新 README、CHANGELOG、ATTRIBUTION，标注原作者 Dr_rOot/agalwood、MIT 许可，以及 aria2-next 的 GPL-2.0 第三方许可。
4. 提交时保持与上游一致的提交信息风格。
```

## 提示词 5：直接套用现成补丁（推荐）

```text
请先阅读 ED2K-WINDOWS-PATCH.md，这是 macOS 版反复实测后整理的逐处补丁清单。请严格按表格里的每个文件、每个白名单加法修改，不要遗漏 plugin 钩子、recovery、session-manager 这几层；漏掉任何一层都会导致界面仍报“此下载不支持 URL 协议”。改完后按文档的 6 项验证清单逐项执行并报告结果。
```

## 注意事项

- 上游代码风格与规范见仓库内 `AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md`、`biome.json`。
- 不要引入未经授权的商业软件下载测试；所有测试使用合成文件或仅做格式校验。
- 不要把个人令牌、RPC secret 或邮箱写进源码/文档。

## 提示词 6：冷门资源

```text
速度为 0 时不要先认定为代码错误。检查 aria2.tellActive 里的 ed2k.peerCount，以及调试日志中的 LowID / 端口映射错误。用 source-lookup.py 查询链接，加入查到的服务器，并在文档中说明纯 eD2k 无法复刻迅雷的中心化加速。
```

## 提示词 7：分享比例

```text
参考 macOS 源码实现每任务 ED2K 分享比例。右键选项：不限、0、1、1.5、2、3、5。每 10 秒轮询 uploadLength，达到比例后移除引擎任务但不删除文件。不要声称这能复刻迅雷的 CDN 加速。
```
