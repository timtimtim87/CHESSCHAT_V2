#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/tim/CODE_PROJECTS/CHESSCHAT_V2"
TF_DIR="$ROOT/terraform"
OUT_DIR="$ROOT/diagrams/output"
STATE_FILE="/tmp/chesschat_dev_state.json"

mkdir -p "$OUT_DIR"

cd "$TF_DIR"
terraform state pull > "$STATE_FILE"
inframap generate --tfstate "$STATE_FILE" > "$OUT_DIR/inframap_vpc.dot"
dot -Tpng "$OUT_DIR/inframap_vpc.dot" -o "$OUT_DIR/inframap_vpc.png"
dot -Tsvg "$OUT_DIR/inframap_vpc.dot" -o "$OUT_DIR/inframap_vpc.svg"

echo "Generated:"
echo "- $OUT_DIR/inframap_vpc.dot"
echo "- $OUT_DIR/inframap_vpc.png"
echo "- $OUT_DIR/inframap_vpc.svg"
