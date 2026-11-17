# Windows 版 ED2K 现成改法（逐处补丁·简体中文）

[English](./ED2K-WINDOWS-PATCH.md)

这是 macOS 版实测后总结的完整修改点。Windows 端可直接照抄，不要再从零猜。

## 1. 所有协议白名单都要加 `ed2k`

Motrix 创建任务会经过多层准入，漏掉任何一层都会报"此下载不支持 URL 协议"。

| 文件 | 位置 | 改法 |
| --- | --- | --- |
| `src/shared/lib/download-source.ts` | `analyzeDownloadSource` 默认参数 | 列表末尾加 `'ed2k'` |
| `src/shared/schemas/download-source.ts` | `sourceProtocolSchema` | 枚举末尾加 `'ed2k'` |
| `src/core/task/source-admission.ts` | `admitDownloadSources` 默认参数 | 列表末尾加 `'ed2k'` |
| `src/core/task/source-admission.ts` | `admitTaskCreateRequest` 的 http 分支 | `['http','https','ftp','ed2k']` |
| `src/core/task/source-admission.ts` | 新增测试 `source-admission.test.ts` | 断言 ED2K 请求被接受 |
| `src/core/task/create-task-handler.ts` | 两处 `admitDownloadSources(..., 'plugin', ...)` | `['http','https','ed2k']` |
| `src/core/task/create-task-handler.ts` | 1 处 `admitDownloadSources(..., 'input', ...)` | `['http','https','ftp','ed2k']` |
| `src/core/task/actions/re-add-task.ts` | recovery 白名单 | `['http','https','ftp','ed2k']` |
| `src/core/session/session-manager.ts` | recovery 白名单 | `['http','https','ftp','ed2k']` |
| `src/core/plugin/hooks/hook-orchestrator.ts` | plugin 白名单 | `['http','https','ed2k']` |

## 2. 引擎替换

- 用 `aria2-next.exe` 替换内置 `aria2c.exe`。
- 包装脚本逻辑见 `ed2k-engine/aria2c-wrapper.sh`：
  - 过滤 `--enable-sqlite3-persistence`、`--sqlite3-db-path`、`--sqlite3-history-limit`；
  - `--version` 输出 `aria2 version 3.1.0-motrix-ed2k`；
  - 其他参数原样转发。

## 3. 打包后的应用也要改

如果改的是已打包应用（不是从源码构建），必须同步修改 `app.asar` 内编译后的 JS。macOS 版踩过的坑：

- 渲染进程分支要用 `dv(...)`，不能照抄主进程的 `Tt(...)`。
- 主进程默认白名单在压缩代码里是 `n=[`http`,`https`,`ftp`,`magnet`]`，不是源码写法 `t=[...]`。
- 主进程 `admitTaskCreateRequest` 压缩后是 `sn(n.uris,`input`,[...])`。
- 插件钩子压缩后是 `sn(a.uris,`plugin`,[...])`，共 3 处。
- 改完必须清空 Electron 缓存目录 `Code Cache` / `GPUCache` 再启动。

## 4. 验证清单（必须逐项通过）

1. `pnpm vitest run src/shared/lib/ed2k-link.test.ts src/shared/lib/download-source.test.ts src/core/task/source-admission.test.ts`
2. `pnpm exec tsc --noEmit`
3. `pnpm exec biome check`（改动文件）
4. 界面：新建任务粘贴 ED2K 链接，不再出现"此下载不支持 URL 协议"
5. RPC：`aria2.tellActive` 中能看到 `ed2k` 字段（hash/name/length），说明引擎真正接管
6. 用无版权文件测试；测试后通过 `aria2.remove` 清理任务

## 5. eD2k 网络引导（必须）

只换引擎还不够，必须给 aria2-next 提供服务器和 Kad 节点，否则 `serverCount=0`、`peerCount=0`，一定 0B/s。

- 随包提供 `server.met`（来自 upd.emule-security.org / Telemacore 活跃服务器列表）和 `nodes.dat`（来自 upd.emule-security.org）。
- 包装脚本启动引擎时追加：
  `--ed2k-server-list=<dir>/server.met --ed2k-node-list=<dir>/nodes.dat --ed2k-server=<ip:port,...>`
- 实测结果：`serverCount=28`、`connectedServerCount=1`、`kadNodeCount≈75`，说明网络接入成功。
- 若某个文件仍 0B/s，用 `aria2.tellActive` 查看该任务的 `ed2k.peerCount`；为 0 表示当前网络没有该 hash 的在线源，任何客户端都下不动。

## 6. 多线程下载（已开启）

Motrix 默认传 `--min-split-size=4194304`（4M），ED2K 下分块偏大。包装脚本在转发参数后追加以下覆盖值，确保多线程生效：

```
--split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200
```

注意必须放在 `"${args[@]}"` 之后，让覆盖值最后生效。已通过 `ps` 验证进程参数中同时出现 Motrix 原值和我们的覆盖值，覆盖值在最后。

## 7. 冷门资源处理

- 实测路由器 UPnP 返回 501，引擎一直是 LowID；需在路由器手动转发 TCP 4662 / UDP 4672。
- 确认 UPnP 无效时加入 `--ed2k-port-mapping=false`。
- 用 `source-lookup.py <链接> --servers` 找出历史上索引过该 hash 的服务器并加入列表。
- 这无法复刻迅雷的中心化索引与离线缓存；若实时源为 0，任何开源 eD2k 客户端速度都是 0。

## 8. 每任务分享比例

移植 `src/core/task/ed2k-sharing.ts`、`command:setEd2kShareRatio` 和右键子菜单。Windows 版需要持久化比例并轮询 `aria2.tellStatus(gid, ["uploadLength"])`；达标后调用 `aria2.remove(gid)`，不要删除已下载文件。

## 9. 分享交互最终版

- 新增 `engine.ed2kShareBandwidth` 布尔设置，默认 true。
- 右键滑轨范围 0–10，步长 0.1；最左 0 表示完成即停传，最右 10 表示文件大小的 10 倍。
- 默认比例 0.5；预设 0.5/1/2/10/不限。
- 将 `aria2-next` 识别为受支持引擎，避免非 Motrix 提示和 16 连接上限。

## 10. 仪表盘贡献

- 在分享监控器中加入 `ed2k-contribution.json`：按天、按任务记录上传增量，保留 90 天。
- 增加 `getEd2kContribution` 查询，以及从传输卡片打开的明细弹窗。
- 总流量为 0 时，传输卡片也必须显示 **ED2K 已贡献**。
