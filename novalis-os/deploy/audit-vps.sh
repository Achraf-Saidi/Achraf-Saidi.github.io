#!/bin/sh
# Read-only inventory. No packages, services, DNS or firewall rules are changed.
set -eu
uname -a
cat /etc/os-release
nproc
uptime
free -h
df -h
ss -lntp
if command -v vmstat >/dev/null 2>&1; then vmstat 1 3; fi
if command -v docker >/dev/null 2>&1; then
  docker version || true
  docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' || true
  docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}} {{.MemPerc}} {{.PIDs}}' || true
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl list-units --type=service --state=running --no-pager || true
  systemctl list-units --type=service --state=failed --no-pager || true
fi
# Deliberately do not dump environment variables, Docker inspect output,
# credentials, database records, application logs or full proxy configuration.
