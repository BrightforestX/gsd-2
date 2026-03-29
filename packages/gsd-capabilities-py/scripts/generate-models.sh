#!/usr/bin/env bash
set -euo pipefail
PKG="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$PKG/schema/gsd-capabilities.linkml.yaml"
OUT="$PKG/src/gsd_capabilities/generated/models.py"
mkdir -p "$(dirname "$OUT")"
if ! command -v linkml >/dev/null 2>&1; then
  echo "linkml CLI not found. Install with: pip install linkml" >&2
  exit 1
fi
linkml generate pydantic "$SCHEMA" --no-metadata >"$OUT"
echo "Wrote $OUT"
