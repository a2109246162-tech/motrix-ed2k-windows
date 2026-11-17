#!/bin/bash
# Install aria2-next (native ED2K engine) into a patched Motrix bundle.
# Usage: install-engine.sh <Motrix.app path> [platform] [arch]
set -euo pipefail
APP="${1:?Usage: install-engine.sh <Motrix.app> [darwin|linux|windows] [x64|arm64]}"
PLATFORM="${2:-darwin}"
ARCH="${3:-x64}"
TAG="v3.1.0"
BASE="https://github.com/AnInsomniacy/aria2-next/releases/download/${TAG}"
case "$PLATFORM-$ARCH" in
  darwin-x64) ASSET="aria2-next-3.1.0-macos-x86_64";;
  darwin-arm64) ASSET="aria2-next-3.1.0-macos-arm64";;
  windows-x64) ASSET="aria2-next-3.1.0-windows-x86_64.exe";;
  windows-arm64) ASSET="aria2-next-3.1.0-windows-arm64.exe";;
  linux-x64) ASSET="aria2-next-3.1.0-linux-x86_64";;
  linux-arm64) ASSET="aria2-next-3.1.0-linux-aarch64";;
  *) echo "Unsupported platform/arch" >&2; exit 2;;
esac
EXTRA="$APP/Contents/Resources/extra/$PLATFORM/$ARCH"
[ -d "$EXTRA" ] || { echo "Missing engine dir: $EXTRA" >&2; exit 2; }
curl -sSL -o "$EXTRA/aria2-next" "$BASE/$ASSET"
chmod +x "$EXTRA/aria2-next"
cp "$(dirname "$0")/aria2c-wrapper.sh" "$EXTRA/aria2c"
cp "$(dirname "$0")/server.met" "$(dirname "$0")/nodes.dat" "$EXTRA/"
chmod +x "$EXTRA/aria2c"
codesign --force --sign - "$EXTRA/aria2-next" 2>/dev/null || true
codesign --force --sign - "$EXTRA/aria2c" 2>/dev/null || true
echo "Installed aria2-next ($ASSET) into $EXTRA"
