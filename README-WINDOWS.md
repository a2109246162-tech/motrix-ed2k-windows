# ED2K 移植包（供 Windows 版 Motrix 使用）

这个文件夹给 Windows 环境下的 WorkBuddy / DeepSeek-V4.1-Flash 使用，用来给 **Windows 版 Motrix 2.4.2** 增加 ED2K 的「识别 + 下载」能力。macOS 版已经实现并验证，代码和说明都在这里。

## 目录结构

- `source/` — ED2K 识别相关源码（可直接对照移植）
  - `ed2k-link.ts`：ED2K 链接解析与校验
  - `ed2k-link.test.ts`：17 个格式测试
  - `download-source.ts` / `download-source.test.ts`：接入协议白名单后的版本
  - `download-source.ts`（schema）/ `source-admission.ts`：协议枚举与默认列表改动
- `engine/` — 下载引擎替换脚本与 Windows 预编译引擎
  - `aria2c-wrapper.sh`：过滤 aria2-next 不支持的参数、伪装版本号（Windows 下改成 .bat/.ps1 即可）
  - `install-engine.sh`：macOS/Linux 安装示例；Windows 参考它的逻辑
  - `windows/aria2-next-3.1.0-windows-x86_64.exe`：Windows x64 引擎（GPL-2.0）
- `prompts/PROMPTS_FOR_WINDOWS.md` — **给 DeepSeek 的提示词**，按顺序喂给模型即可
- `docs/` — 修改说明、变更清单、致谢、第三方许可，以及上游的代码规范文件（AGENTS.md / CLAUDE.md / CONTRIBUTING.md / biome.json）

## 推荐操作步骤

1. 在 Windows WorkBuddy 里打开本文件夹。
2. 先把 `docs/AGENTS.md`、`docs/CLAUDE.md`、`docs/CONTRIBUTING.md`、`docs/biome.json` 给 DeepSeek 看，要求它遵守上游风格。
3. 再按顺序使用 `prompts/PROMPTS_FOR_WINDOWS.md` 里的 4 条提示词。
4. 把 `source/` 下的文件作为参考实现，要求 Windows 分支产生等价改动。
5. 引擎部分：用 `engine/windows/aria2-next-3.1.0-windows-x86_64.exe` 替换 Motrix 内置 `aria2c.exe`，并用包装脚本：
   - 过滤 `--enable-sqlite3-persistence`、`--sqlite3-db-path`、`--sqlite3-history-limit`；
   - 在 `--version` 时输出 `aria2 version 3.1.0-motrix-ed2k`；
   - 其余参数原样转发给 `aria2-next.exe`。
6. 运行测试并做一次**合成文件**的 ED2K 干跑，不要下载 Windows/Office 镜像。

## 重要说明

- 原项目：agalwood/Motrix，作者 Dr_rOot / agalwood，MIT License。
- `aria2-next` 为 GPL-2.0；分发含该引擎的构建时需要提供源码获取方式（项目 GitHub Releases）。
- 本包内的示例链接只用于格式测试，不应用于下载未经授权的商业软件。

## 已验证（macOS）

- 62 个 ED2K 单元测试通过；TypeScript 类型检查通过；Biome 风格检查通过。
- aria2-next 3.1.0 接受 Motrix 启动参数（过滤 SQLite 参数后），RPC 正常。
- 合成 ED2K 链接干跑成功进入传输流程。
