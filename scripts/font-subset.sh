#!/usr/bin/env bash
set -euo pipefail

FONTTOOLS_VERSION="4.64.0"
UNICODES="U+0020-007E,U+00A0-00FF,U+2010-2027,U+20AC,U+2122"
SRC_DIR="${SRC_DIR:-vendor/fonts}"
OUT_DIR="assets/fonts"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PYFTSUBSET_BIN="${PYFTSUBSET_BIN:-pyftsubset}"

"$PYTHON_BIN" - <<PY
import fontTools
assert fontTools.version == "${FONTTOOLS_VERSION}", fontTools.version
PY

mkdir -p "$OUT_DIR"
"$PYFTSUBSET_BIN" "$SRC_DIR/Oswald-SemiBold.ttf" --unicodes="$UNICODES" --flavor=woff2 --output-file="$OUT_DIR/oswald-600.woff2"
"$PYFTSUBSET_BIN" "$SRC_DIR/Oswald-Bold.ttf" --unicodes="$UNICODES" --flavor=woff2 --output-file="$OUT_DIR/oswald-700.woff2"
"$PYFTSUBSET_BIN" "$SRC_DIR/PlayfairDisplay-Bold.ttf" --unicodes="$UNICODES" --flavor=woff2 --output-file="$OUT_DIR/playfair-700.woff2"
"$PYFTSUBSET_BIN" "$SRC_DIR/JetBrainsMono-Medium.ttf" --unicodes="$UNICODES" --flavor=woff2 --output-file="$OUT_DIR/jetbrains-mono-500.woff2"
