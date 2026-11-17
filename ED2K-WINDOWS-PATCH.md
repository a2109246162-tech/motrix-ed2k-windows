# Windows Port — Ready-made ED2K Patch List (English)

[简体中文](./ED2K-WINDOWS-PATCH.zh-CN.md)

These are the exact changes verified on macOS. Copy them; do not guess.

## 1. Add `ed2k` to every allowlist

Motrix checks sources in several layers. Missing any one of them produces `unsupportedProtocol`.

| File | Location | Change |
| --- | --- | --- |
| `src/shared/lib/download-source.ts` | `analyzeDownloadSource` default | append `'ed2k'` |
| `src/shared/schemas/download-source.ts` | `sourceProtocolSchema` | append `'ed2k'` |
| `src/core/task/source-admission.ts` | `admitDownloadSources` default | append `'ed2k'` |
| `src/core/task/source-admission.ts` | `admitTaskCreateRequest` http branch | `['http','https','ftp','ed2k']` |
| `src/core/task/source-admission.ts` | new `source-admission.test.ts` | assert ED2K request accepted |
| `src/core/task/create-task-handler.ts` | two `plugin` allowlists | `['http','https','ed2k']` |
| `src/core/task/create-task-handler.ts` | one `input` allowlist | `['http','https','ftp','ed2k']` |
| `src/core/task/actions/re-add-task.ts` | recovery allowlist | `['http','https','ftp','ed2k']` |
| `src/core/session/session-manager.ts` | recovery allowlist | `['http','https','ftp','ed2k']` |
| `src/core/plugin/hooks/hook-orchestrator.ts` | plugin allowlist | `['http','https','ed2k']` |

## 2. Engine replacement

Use `aria2-next.exe` in place of `aria2c.exe`. The wrapper logic is in `ed2k-engine/aria2c-wrapper.sh`:

- filter `--enable-sqlite3-persistence`, `--sqlite3-db-path`, `--sqlite3-history-limit`;
- print `aria2 version 3.1.0-motrix-ed2k` for `--version`;
- forward every other argument unchanged.

## 3. Network bootstrap (required)

Replacing the engine alone is not enough: without server/Kad lists you get `serverCount=0`, `peerCount=0`, and 0 B/s.

Ship `server.met` and `nodes.dat`, and append:

```
--ed2k-server-list=<dir>/server.met --ed2k-node-list=<dir>/nodes.dat --ed2k-server=<ip:port,...>
```

Observed after bootstrap: `serverCount=28`, `connectedServerCount=1`, `kadNodeCount≈75`.

## 4. Multithreading (enabled)

Append these **after** `"${args[@]}"` so they win:

```
--split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200
```

Motrix passes `--min-split-size=4194304` (4M); the 1M override is intentional.

## 5. Packaged application

If patching a built app rather than rebuilding from source, edit the compiled bundles inside `app.asar`:

- Renderer error helper is `dv(...)`, not the main-process `Tt(...)`.
- Main default list is minified as `n=[...]`, not the source form `t=[...]`.
- Main `admitTaskCreateRequest` is `sn(n.uris, `input`, [...])`.
- Plugin hook is `sn(a.uris, `plugin`, [...])` — three occurrences.
- Renderer schema enum is `ba([...])`.
- Clear `Code Cache` and `GPUCache` before restarting.

## 6. Verification checklist

1. `pnpm vitest run src/shared/lib/ed2k-link.test.ts src/shared/lib/download-source.test.ts src/core/task/source-admission.test.ts`
2. `pnpm exec tsc --noEmit`
3. `pnpm exec biome check` on changed files
4. UI: pasting an ED2K link no longer shows `unsupportedProtocol`
5. RPC: `aria2.tellActive` includes an `ed2k` object with hash/name/length
6. Use a copyright-safe file for transfer testing; remove the task afterwards

## 7. Cold resources

- UPnP returned HTTP 501 on the tested router; the engine stayed LowID. Manually forward TCP 4662 / UDP 4672.
- Add `--ed2k-port-mapping=false` when UPnP is known to fail.
- Use `source-lookup.py <link> --servers` to add servers that historically indexed the hash.
- This cannot reproduce Xunlei's central index/offline cache. If live peers are zero, speed is zero in any open eD2k client.

## 8. Per-task sharing ratio

Port `src/core/task/ed2k-sharing.ts`, `command:setEd2kShareRatio` and the right-click submenu. The Windows build must persist ratios and poll `aria2.tellStatus(gid, ["uploadLength"])`. Reaching the target calls `aria2.remove(gid)`; it must not delete downloaded files.

## 9. Final sharing UX

- Add `engine.ed2kShareBandwidth` boolean setting (default true).
- Right-click slider range 0–10, step 0.1; left 0 stops upload after completion, right 10 means 10x file size.
- Default ratio 0.5; presets 0.5/1/2/10/unlimited.
- Treat `aria2-next` as a supported engine so the non-Motrix warning and 16-connection cap do not trigger.

## 10. Dashboard contribution

- Add `ed2k-contribution.json` tracking to the sharing monitor: per-day and per-task upload deltas, 90-day retention.
- Add a `getEd2kContribution` query and a dialog opened from the transfer tile.
- The transfer tile must show **ED2K 已贡献** even when total transfer is zero.
