#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/tim/CODE_PROJECTS/CHESSCHAT_V2"
OUT_DIR="$ROOT/diagrams/output"
DOT_FILE="$ROOT/diagrams/graphviz/aws_icons_vpc.dot"

mkdir -p "$OUT_DIR"

dot -Tpng "$DOT_FILE" -o "$OUT_DIR/aws_icons_vpc.png"
dot -Tsvg "$DOT_FILE" -o "$OUT_DIR/aws_icons_vpc.svg"

echo "Generated:"
echo "- $OUT_DIR/aws_icons_vpc.png"
echo "- $OUT_DIR/aws_icons_vpc.svg"
