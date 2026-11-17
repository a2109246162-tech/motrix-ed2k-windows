#!/usr/bin/env python3
"""Query historical eD2k source availability for a file hash.

This is a diagnostic helper, not a downloader and not a guarantee of live peers.
It queries https://ed2k.shortypower.org/?hash=<HASH> and maps reported server
names to addresses from a servers.json file shipped beside this script.

Usage:
  python3 source-lookup.py 'ed2k://|file|name|size|HASH|/' [--servers]
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

TARGET = "https://ed2k.shortypower.org/?hash={hash}"


def extract_hash(text: str) -> str:
    match = re.search(r"\|([0-9a-fA-F]{32})\|", text)
    if not match:
        raise SystemExit("No 32-character eD2k hash found")
    return match.group(1).upper()


def fetch_html(hash_value: str) -> str:
    url = TARGET.format(hash=urllib.parse.quote(hash_value))
    with urllib.request.urlopen(url, timeout=20) as response:
        return response.read().decode("utf-8", "replace")


def parse_servers(html: str) -> list[tuple[str, str, str]]:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    names = ["eMule Sunrise", "Astra-3", "MO-ad-free", "Astra-5", "Astra-4"]
    rows = []
    for name in names:
        index = text.find(name)
        if index < 0:
            continue
        segment = text[index : index + 300]
        match = re.search(r"[\d.]+\s*[KMGT]?B\s+(\d+)\s+(\d+)", segment, re.I)
        rows.append((name, match.group(1) if match else "-", match.group(2) if match else "-"))
    return rows


def load_addresses() -> dict[str, str]:
    candidates = [Path(__file__).with_name("servers.json"), Path("ed2k-engine/servers.json")]
    for path in candidates:
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return {
                    server["name"]: f"{server['ip']}:{server['port']}"
                    for server in data.get("servers", [])
                }
            except Exception:
                continue
    return {}


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    hash_value = extract_hash(sys.argv[1])
    rows = parse_servers(fetch_html(hash_value))
    addresses = load_addresses()
    print(f"Hash: {hash_value}")
    print("Historical availability (NOT live peers):")
    found = []
    for name, availability, complete in rows:
        addr = addresses.get(name, "address unknown")
        print(f"  {name:<32} {addr:<24} sources={availability} complete={complete}")
        if addr != "address unknown":
            found.append(addr)
    if "--servers" in sys.argv:
        print("Server list for aria2-next:")
        print(",".join(dict.fromkeys(found)))


if __name__ == "__main__":
    main()
