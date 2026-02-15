#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/tim/CODE_PROJECTS/CHESSCHAT_V2"
TF_DIR="$ROOT/terraform"
OUT_DIR="$ROOT/diagrams/output"

mkdir -p "$OUT_DIR"

cd "$TF_DIR"
terraform graph > "$OUT_DIR/terraform_graph.dot"
dot -Tpng "$OUT_DIR/terraform_graph.dot" -o "$OUT_DIR/terraform_graph.png"
dot -Tsvg "$OUT_DIR/terraform_graph.dot" -o "$OUT_DIR/terraform_graph.svg"

echo "Generated:"
echo "- $OUT_DIR/terraform_graph.dot"
echo "- $OUT_DIR/terraform_graph.png"
echo "- $OUT_DIR/terraform_graph.svg"
