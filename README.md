<div align="center">

<img src="./public/app-icon.png" alt="Motrix ED2K for Windows" width="128" />

# Motrix 2.4.2 · ED2K Edition (Windows)

**Real ED2K for Motrix on Windows: link recognition, aria2-next downloads, and reciprocal per-task sharing.**

[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue.svg)](#requirements)
[![Base](https://img.shields.io/badge/base-Motrix%202.4.2-lightgrey.svg)](https://github.com/agalwood/Motrix)
[![Engine](https://img.shields.io/badge/engine-aria2--next%203.1.0-orange.svg)](./ed2k-engine)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[简体中文](./README.zh-CN.md) | English

</div>

---

[简体中文说明是主文档](./README.zh-CN.md)。This is a focused fork of [agalwood/Motrix](https://github.com/agalwood/Motrix) v2.4.2 for Windows, adding ED2K link admission and an engine that actually speaks eD2k. It is the Windows sibling of [motrix-ed2k (macOS)](https://github.com/a2109246162-tech/motrix-ed2k); the ED2K logic is identical, only the platform-specific bootstrap injection differs (macOS uses a shell wrapper, Windows injects in `Aria2ConfigBuilder.buildArgs`).

## Features

| Feature | Status |
| --- | --- |
| ED2K file / server / serverlist links | Parsed and admitted through every Motrix layer |
| ED2K engine | Bundled `aria2-next 3.1.0` (Windows x64), eD2k/Kad native |
| Server and Kad bootstrap | `server.met` + `nodes.dat` |
| Multi-threaded transfer | 16-way split, 200 eD2k connections, 1 MiB min split |
| Original file names | Extracted from the link, percent-decoded |
| Per-task sharing ratio | Right-click, slider 0–10x file size |
| Global sharing switch | Settings → BitTorrent → ED2K 分享 |
| Contribution dashboard | Lifetime, daily breakdown, top tasks |
| HTTP / HTTPS / FTP / BT / Magnet | Preserved from upstream |

## Requirements & install

Windows 10/11 x64; a network that permits eD2k traffic. Download a Windows build from [Releases](../../releases), unzip/extract and run `Motrix.exe`. If SmartScreen blocks it, choose More info → Run anyway. Do not enable in-app auto-update — it would restore the unpatched engine.

## Use

Paste an `ed2k://|file|...|/` link into **New Task → Links**. The name comes from the link, is saved as `<name>.motrix` while incomplete, and is renamed back on completion. For sharing, keep **Settings → BitTorrent → ED2K 分享** enabled, then right-click an ED2K task and pick a slider value (0 stop, 0.5 default, 1–10x, unlimited). The file is never deleted when the ratio is reached.

Speed depends entirely on live sources; a cold hash stays at 0 B/s in any open client. Run `python ed2k-engine\diagnose.py` for live RPC status. Forward TCP 4662 / UDP 4672 for a chance at HighID.

## Build from source

See [README.zh-CN.md](./README.zh-CN.md#从源码构建). In short: `corepack pnpm install --frozen-lockfile`, `corepack pnpm run build`, then `corepack pnpm run stage:electron -- --platform win32 --arch x64`.

## Credits & license

Upstream [agalwood/Motrix](https://github.com/agalwood/Motrix) (MIT); macOS sibling [motrix-ed2k](https://github.com/a2109246162-tech/motrix-ed2k); engine [aria2-next](https://github.com/AnInsomniacy/aria2-next) (GPL-2.0). See [LICENSE](./LICENSE), [ATTRIBUTION.md](./ATTRIBUTION.md), [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Full change list: [CHANGELOG-ED2K.zh-CN.md](./CHANGELOG-ED2K.zh-CN.md).
