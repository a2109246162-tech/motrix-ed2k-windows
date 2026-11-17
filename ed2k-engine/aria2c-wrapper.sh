#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
for arg in "$@"; do
  if [ "$arg" = "--version" ] || [ "$arg" = "-v" ]; then
    printf "%s\n%s\n" "aria2 version 3.1.0-motrix-ed2k" "Enabled Features: Async DNS, BitTorrent, Metalink"
    exit 0
  fi
done
args=()
for arg in "$@"; do
  case "$arg" in
    --enable-sqlite3-persistence=*|--sqlite3-db-path=*|--sqlite3-history-limit=*) ;;
    *) args+=("$arg") ;;
  esac
done
exec "$DIR/aria2-next" --ed2k-server-list="$DIR/server.met" --ed2k-node-list="$DIR/nodes.dat" --ed2k-server=176.125.242.230:5555,176.116.0.62:7555,176.123.5.89:4725,176.116.0.51:6555,54.37.74.32:4661,185.213.22.235:4661,85.17.116.222:6082,213.252.245.239:43333,213.141.198.207:4232,185.25.48.89:18357,57.128.161.24:6666,213.252.245.239:33333,57.130.51.107:4232 "${args[@]}" --ed2k-port-mapping=false --split=16 --max-connection-per-server=16 --min-split-size=1M --ed2k-max-connections=200
