# ED2K Edition — Changelog (English)

[简体中文](./CHANGELOG-ED2K.zh-CN.md)

Base: upstream Motrix v2.4.2 (`c601dcf`), with the macOS 12 compatibility patches from `motrix-macos12`.

## Changes

| Area | Files | What changed |
| --- | --- | --- |
| ED2K parser | `src/shared/lib/ed2k-link.ts` (new) | Strict parsing of eD2k file/server/serverlist links with precise diagnostics. |
| Parser tests | `src/shared/lib/ed2k-link.test.ts` (new) | 17 tests covering valid formats and malformed inputs. |
| Source analysis | `src/shared/lib/download-source.ts`, `src/shared/schemas/download-source.ts` | Added `ed2k` protocol and diagnostic; ED2K branch in `analyzeDownloadSource`. |
| Admission | `src/core/task/source-admission.ts` (+ `.test.ts`) | Added `ed2k` to default allowlist and to `admitTaskCreateRequest`; tests assert ED2K requests are accepted. |
| Task creation | `src/core/task/create-task-handler.ts` | Added `ed2k` to input and both plugin-hook allowlists. |
| Recovery | `src/core/task/actions/re-add-task.ts`, `src/core/session/session-manager.ts` | Added `ed2k` to recovery allowlists. |
| Plugin hooks | `src/core/plugin/hooks/hook-orchestrator.ts` | Added `ed2k` to plugin allowlist. |
| Engine | `ed2k-engine/aria2c-wrapper.sh`, `ed2k-engine/install-engine.sh` | Replaced aria2 with aria2-next 3.1.0; filter SQLite options; normalize `--version`; load `server.met` / `nodes.dat`; add active servers; enable 16-way split and 200 ED2K connections. |
| Network bootstrap | `ed2k-engine/server.met`, `nodes.dat`, `servers.json` | eD2k server/Kad lists from upd.emule-security.org and Telemacore. |
| Packaged app | `app.asar` in the DMG | Injected the same ED2K logic into the compiled main/renderer bundles; fixed minified-code differences (`dv` vs `Tt`, `n=[...]` vs `t=[...]`, `ba([...])` enum). |
| Docs | README (EN/ZH), this changelog (EN/ZH), Windows patch/prompts (EN/ZH), `ATTRIBUTION.md`, `THIRD_PARTY_NOTICES.md` | Describe verified behaviour and limitations. |

## Verification

- 64 ED2K-related tests pass; `tsc --noEmit` and Biome pass.
- macOS 12.7.6: app and engine start; RPC `serverCount=28`, `connectedServerCount=1`, `kadNodeCount≈75`.
- The Office ISO link supplied by the user was only used as a format test case; a dry run reported `CN:0` (no online source). It was not downloaded.

## Known limitations

- Actual transfer speed depends entirely on online peers for the file hash. With `CN:0`, 0 B/s is expected in any client.
- The bundled `aria2-next` is GPL-2.0; MIT applies only to the Motrix source and this fork's patches.
- Login-item registration is unavailable on macOS 12 (inherited from the base compatibility patch).

## Cold-resource diagnostics

- Added `ed2k-engine/source-lookup.py` to query historical eD2k availability and print matching `ip:port` servers.
- Added servers reported for the previously supplied hash (`eMule Sunrise`, `Astra-3`, `MO-ad-free`) to the wrapper.
- Disabled UPnP in the wrapper because it returns error 501; manual router forwarding is documented.

## Per-task sharing

- Added `src/core/task/ed2k-sharing.ts`: per-task ratio store and a 10-second monitor using aria2-next `uploadLength`.
- Added `command:setEd2kShareRatio` IPC command and a right-click **ED2K 分享比例** submenu on ED2K tasks.
- Options: unlimited, 0 (stop upload after completion), 1, 1.5, 2, 3, 5. Reaching the target removes the engine task and keeps the file.

## Final sharing UX and engine identity

- Added `engine.ed2kShareBandwidth` setting (default true) and a switch in Settings.
- Per-task slider 0–10 (0.1 step) with presets 0.5/1/2/10/unlimited; default 0.5.
- Monitor applies the global switch, then the per-task ratio, to every ED2K task.
- Recognised `aria2-next` / `3.1.0-motrix-ed2k` as a supported engine, removing the false non-Motrix aria2 warning and the 16-connection cap.

## Speed diagnostics

- Added `ed2k-engine/diagnose.py` for live RPC inspection of LowID, server/Kad counts, port mapping and per-task peer counts.
- Documented the measured state: LowID, Kad firewalled, UPnP off, one connected server, zero peers for the paused task.

## Dashboard contribution

- Added `ed2k-contribution.json` tracking in the sharing monitor: per-day, per-task upload deltas, 90-day retention.
- Added `query:getEd2kContribution` and a detail dialog opened from the transfer tile.
- The transfer tile now always shows **ED2K 已贡献**, including when total transfer is zero.

## Output name and finalize fixes

- ED2K links are no longer passed through `new URL()`. `ed2kLinkFilename()` extracts and percent-decodes the file name carried by the link, so a task is named `deepin-...iso`, not `download`.
- The HTTP create path now uses that name for `out`, the incomplete `.motrix` file, and the final rename.
- `removeDownloadResult` now accepts aria2-next's error text without a hash mark (`GID <gid>` as well as `GID#<gid>`). Without this, a completed ED2K download stalled at `.motrix` with "Could not remove download result".
- End-to-end check: a 3.3 MB ED2K PDF completed, finalized as `[Wiley] Ubuntu Linux Toolbox ....pdf`, and `file` reports `PDF document, version 1.6`.

- Task inspector now labels ED2K tasks as `ED2K` instead of the internal HTTP transport type.

---

## Windows port (this branch vs. the macOS ED2K edition)

This branch ports the macOS ED2K edition to Windows. ED2K recognition, download, sharing and contribution logic are identical to macOS; only platform-specific changes are listed here.

| Area | Files | Change | Reason |
| --- | --- | --- | --- |
| Engine bootstrap | `src/core/engine/aria2/ed2k-engine-bootstrap.ts` (new) | Detect `aria2-next`; emit `server.met` / `nodes.dat` / active servers / multi-thread overrides | Node cannot spawn a `.cmd`/`.sh` wrapper on Windows, so injection happens in the app layer |
| Engine args | `src/core/engine/aria2/aria2-config-builder.ts` | New `ed2kBootstrapDir` option; append ED2K args at the tail of `buildArgs()` | aria2 uses the last occurrence of an option, so defaults like `--min-split-size=4194304` are overridden |
| Engine start | `src/core/engine/engine-supervisor.ts` | Pass `featureReport.version` to `buildArgs()` | Only inject when aria2-next is detected; stock aria2 is untouched |
| Main / server | `src/main/index.ts`, `src/server/index.ts` | Pass the `extra/ed2k` data dir to the ConfigBuilder | Keep server.met / nodes.dat resolvable after packaging |
| Bootstrap data | `extra/ed2k/server.met`, `extra/ed2k/nodes.dat` (new) | Copied from `ed2k-engine/` | Ship server and Kad bootstrap lists |
| Packaging | `electron-builder.json` | Add `./extra/ed2k/` to `extraResources` | Include bootstrap data in the installer |
| Tests | `src/core/engine/aria2/ed2k-engine-bootstrap.test.ts` (new) | Cover detection, arg generation, no-op for stock aria2 | Guard the injection logic |

### Key difference from macOS

- **Injection point**: macOS intercepts `aria2c` via `ed2k-engine/aria2c-wrapper.sh`; Windows appends args in `Aria2ConfigBuilder.buildArgs()`. Identical arguments, both appended last to win over defaults.
- **Engine binary**: `aria2-next-3.1.0-windows-x86_64.exe` placed at `extra/win32/x64/aria2c.exe` (GPL-2.0).
- **SQLite options**: no wrapper filtering; aria2-next does not advertise `SQLite3-Persistence`, so `hasSqlitePersistence=false` and `buildArgs()` already omits the three SQLite flags.

The authoritative, more detailed change log is [CHANGELOG-ED2K.zh-CN.md](./CHANGELOG-ED2K.zh-CN.md).
