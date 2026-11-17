# Motrix ED2K Windows — 成品下载

Windows 版 ED2K Motrix 可运行成品（约 168 MB）。因 GitHub 单文件 100 MB 限制，拆成 2 个分片。

## 下载与合并

下载两个 `.part-*` 文件放到同一目录，合并：

- **Git Bash**：`cat Motrix-2.4.2-ED2K-win-x64-portable.zip.part-* > Motrix-2.4.2-ED2K-win-x64-portable.zip`
- **CMD**：`copy /b Motrix-2.4.2-ED2K-win-x64-portable.zip.part-* Motrix-2.4.2-ED2K-win-x64-portable.zip`

合并后校验 SHA-256：`eb1d916cf727426fc5463bf47e05998129143fb11900dbb1218f4a9c7db55cd2`

解压后运行 `Motrix.exe`（无需安装）。成品含 aria2-next 3.1.0 引擎 + eD2k 服务器/Kad 引导数据，已实测可启动并带 ED2K 参数运行。

源码、构建说明与变更清单见主分支 `main`。

> 内置引擎 aria2-next 为 GPL-2.0；Motrix 源码与本项目补丁为 MIT。
