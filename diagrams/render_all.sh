#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/tim/CODE_PROJECTS/CHESSCHAT_V2"
OUT_DIR="$ROOT/diagrams/output"
PY_BIN="$ROOT/diagrams/.venv/bin/python"

mkdir -p "$OUT_DIR"

"$PY_BIN" "$ROOT/diagrams/python/chesschat_vpc_diagram.py"

plantuml -tpng -o "$OUT_DIR" "$ROOT/diagrams/plantuml/chesschat_vpc.puml"
plantuml -tsvg -o "$OUT_DIR" "$ROOT/diagrams/plantuml/chesschat_vpc.puml"

"$ROOT/diagrams/graphviz/render_graphviz_aws_icons.sh"
"$ROOT/diagrams/terraform-auto/render_inframap.sh"
"$ROOT/diagrams/terraform-auto/render_terraform_graph.sh"

echo "All diagram variants rendered under: $OUT_DIR"
