#!/bin/sh
# Read-only inventory. No packages, services, DNS or firewall rules are changed.
set -eu
uname -a
cat /etc/os-release
nproc
free -h
df -h
ss -lntp
if command -v docker >/dev/null 2>&1; then docker version; docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'; fi
if command -v systemctl >/dev/null 2>&1; then systemctl list-units --type=service --state=running --no-pager; fi
