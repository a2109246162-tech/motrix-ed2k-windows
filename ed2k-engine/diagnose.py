#!/usr/bin/env python3
"""Print live ED2K network and per-task peer status from aria2-next RPC.

Usage: python3 diagnose.py [--port 16800] [--secret TOKEN]
If --secret is omitted, read it from the running aria2-next command line.
"""
import argparse
import json
import re
import subprocess
import urllib.request


def running_args() -> str:
    try:
        output = subprocess.check_output(
            ["ps", "-axo", "command="], text=True, timeout=5
        )
    except Exception:
        return ""
    for line in output.splitlines():
        if "aria2-next" in line and "--rpc-secret=" in line:
            return line
    return ""


def call(port: int, secret: str, method: str, params=None):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": f"aria2.{method}",
        "params": [f"token:{secret}"] + (params or []),
    }
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/jsonrpc",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response).get("result")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=16800)
    parser.add_argument("--secret", default="")
    args = parser.parse_args()
    secret = args.secret
    if not secret:
        match = re.search(r"--rpc-secret=(\S+)", running_args())
        secret = match.group(1) if match else ""
    if not secret:
        raise SystemExit("RPC secret not found; pass --secret")

    status = call(args.port, secret, "getEd2kStatus")
    print("ED2K network")
    for key in (
        "serverCount",
        "connectedServerCount",
        "server",
        "serverName",
        "lowId",
        "kadNodeCount",
        "kadFirewalled",
        "portMapping",
        "tcpPort",
        "udpPort",
        "peerCreditCount",
    ):
        print(f"  {key}: {status.get(key)}")

    tasks = []
    for method, params in (("tellActive", []), ("tellWaiting", [0, 100])):
        tasks.extend(call(args.port, secret, method, params) or [])
    print("Tasks")
    for task in tasks:
        ed2k = task.get("ed2k") or {}
        print(
            f"  {task.get('gid')} status={task.get('status')} "
            f"completed={task.get('completedLength')}/{task.get('totalLength')} "
            f"speed={task.get('downloadSpeed')} "
            f"peers={ed2k.get('peerCount')} servers={ed2k.get('connectedServerCount')} "
            f"kad={ed2k.get('kadNodeCount')} name={ed2k.get('name', '')}"
        )


if __name__ == "__main__":
    main()
