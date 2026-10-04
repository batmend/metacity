#!/usr/bin/env bash
# Глиф фонт (PBF) татах. Апп өөрийн серверээс фонт үзүүлнэ — гадны CDN-ээс хамаарахгүй.
# Хэрэглээ: scripts/fetch-fonts.sh [муж ...]   (жишээ: 0-255 1024-1279)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="../../apps/web/public/fonts"
ZIP="data/fonts-v2.0.zip"
mkdir -p data "$OUT"
[ -f "$ZIP" ] || curl -L -o "$ZIP" https://github.com/openmaptiles/fonts/releases/download/v2.0/v2.0.zip
RANGES=("$@"); [ ${#RANGES[@]} -eq 0 ] && RANGES=(0-255 256-511 1024-1279 8192-8447)
for font in "Noto Sans Regular" "Noto Sans Bold"; do
  for r in "${RANGES[@]}"; do
    unzip -o -q "$ZIP" "$font/$r.pbf" -d "$OUT"
  done
done
echo "фонтууд: $OUT"
