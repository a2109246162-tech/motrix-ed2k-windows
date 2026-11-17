# Windows Port Prompts (English) — for DeepSeek-V4.1-Flash

[简体中文](./PROMPTS_FOR_WINDOWS.zh-CN.md)

Goal: give Windows Motrix 2.4.2 the same ED2K recognition and engine support as the macOS edition, without breaking HTTP/HTTPS/FTP/BT/Magnet.

## Prompt 1 — Scope and style

```text
You are maintaining a Windows fork of agalwood/Motrix v2.4.2. Follow the existing code style, naming and comment conventions. Make the smallest possible changes and add a short Chinese comment explaining why each change is needed. Do not only change UI validation; the download engine must also support ED2K.
```

## Prompt 2 — Recognition layer

```text
Port the logic in src/shared/lib/ed2k-link.ts and its test. Support ed2k://|file|name|size|32-hex-hash|/ and the sources variant. Reject 31-character or non-hex hashes with a precise `invalidEd2k` diagnostic. Add `ed2k` to the protocol schema, `analyzeDownloadSource` default allowlist and source-admission default list. Run the tests.
```

## Prompt 3 — Allowlists (most missed step)

```text
Read ED2K-WINDOWS-PATCH.md section 1 carefully. Add `ed2k` to EVERY listed allowlist, including plugin hooks, recovery and session restore. Missing any single layer still produces `此下载不支持 URL 协议`. Add the source-admission test that asserts an ED2K request is accepted.
```

## Prompt 4 — Engine and network bootstrap

```text
Replace the bundled aria2c.exe with aria2-next 3.1.0 Windows x64. Use aria2c-wrapper.sh as the reference: filter the three SQLite options, print `aria2 version 3.1.0-motrix-ed2k` for --version, load server.met and nodes.dat, add active servers, and append `--split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200` after the forwarded arguments.
```

## Prompt 5 — Verification

```text
Run the 64 ED2K tests, tsc --noEmit and Biome. Confirm in the UI that an ED2K link no longer shows unsupportedProtocol. Confirm via aria2.tellActive that the task contains an `ed2k` object (hash, name, length) and that serverCount/kadNodeCount are non-zero. Test with a copyright-safe file only, and remove the task afterwards. If peerCount is 0, report that the file has no online source rather than claiming a code failure.
```

## References

- `ED2K-WINDOWS-PATCH.md` — exact file-by-file changes
- `docs/AGENTS.md`, `docs/CLAUDE.md`, `docs/CONTRIBUTING.md`, `docs/biome.json` — upstream conventions
- SMB copy: `\\192.168.1.248\公共空间\ed2k\`

## Prompt 6 — Cold resources

```text
If speed is 0, do not assume a code bug. Check `aria2.tellActive` ed2k.peerCount and debug logs for LowID / port mapping errors. Run source-lookup.py with the link, add the reported servers, and document that Xunlei-like centralized acceleration cannot be reproduced with open eD2k.
```

## Prompt 7 — Sharing ratio

```text
Implement per-task ED2K sharing using the macOS source as reference. Right-click menu options: unlimited, 0, 1, 1.5, 2, 3, 5. Poll uploadLength every 10 seconds and remove the engine task at the target ratio without deleting files. Do not claim this reproduces Xunlei's CDN acceleration.
```
