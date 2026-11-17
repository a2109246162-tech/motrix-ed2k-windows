# ED2K 引擎

本目录包含把 Motrix 变成 eD2k 客户端所需的运行时文件。Motrix 本身不实现 eD2k，协议由 [aria2-next](https://github.com/AnInsomniacy/aria2-next) 完成。

## 文件

| 文件 | 用途 |
| --- | --- |
| `windows/aria2-next-3.1.0-windows-x86_64.exe` | Windows x64 引擎（GPL-2.0），打包为 `extra/win32/x64/aria2c.exe` |
| `install-engine.cmd` | 把引擎和引导数据装进已 stage 的 Windows Motrix 目录 |
| `aria2c-wrapper.sh` | macOS 版包装脚本（Windows 不用，保留供对照） |
| `server.met` | eD2k 服务器列表（来自 upd.emule-security.org） |
| `nodes.dat` | Kad 引导节点 |
| `servers.json` | 活跃服务器元数据，供 `source-lookup.py` 与引导逻辑使用 |
| `source-lookup.py` | 按 hash 查询历史可用源与服务器 |
| `diagnose.py` | 打印实时 RPC 状态：LowID、服务器/Kad 数量、端口映射、每任务 peer |

## Windows 的引导参数如何注入

Windows 不能用 Node 直接启动 `.cmd`/`.sh` 包装脚本，所以不走 `aria2c-wrapper.sh`。改为在应用层注入：

- `src/core/engine/aria2/ed2k-engine-bootstrap.ts` 识别 `aria2-next`，生成引导参数；
- `Aria2ConfigBuilder.buildArgs()` 在参数**末尾**追加，因此覆盖默认值（aria2 取最后一次出现的选项）；
- 引导数据放在 `extra/ed2k/`（server.met、nodes.dat），由 `main/index.ts` / `server/index.ts` 传给 ConfigBuilder。

注入的参数与 macOS wrapper 完全一致：

```
--ed2k-server-list=<dir>/server.met
--ed2k-node-list=<dir>/nodes.dat
--ed2k-server=<活跃服务器列表>
--ed2k-port-mapping=false
--split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200
```

只有识别到 `aria2-next` 才会注入；普通 aria2 完全不受影响。SQLite 参数由源码已有逻辑处理：`aria2-next` 不上报 `SQLite3-Persistence` token，`hasSqlitePersistence=false`，`buildArgs()` 自动跳过那三个参数。

## 诊断

应用运行时执行：

```bat
python diagnose.py
python source-lookup.py "ed2k://|file|name|size|HASH|/" --servers
```

## 端口

- TCP `4662`
- UDP `4672`

在路由器把两个端口转发到本机局域网地址，以提高拿到 HighID 的概率。测试路由器 UPnP 返回 501，因此引导参数里关闭了 UPnP 映射。
