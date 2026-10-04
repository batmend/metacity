#!/usr/bin/env bash
# OSM → PMTiles (planetiler). Монголын OSM хуулбарыг татаж, өгөгдсөн bbox-оор
# Meta City схемийн дагуу tile үүсгэнэ.
#
# Хэрэглээ:
#   scripts/build-osm.sh                      # DEMO bbox (Сүхбаатарын талбай орчим)
#   BBOX=106.70,47.80,107.15,48.00 scripts/build-osm.sh   # бүх Улаанбаатар
#
# Шаардлага: Java 21+, ~4 GB RAM (Улаанбаатар), интернет (эхний удаа).
set -euo pipefail
cd "$(dirname "$0")/.."

BBOX="${BBOX:-106.898,47.896,106.938,47.93}"
OUT="${OUT:-out/ub.pmtiles}"
RAW="${OUT%.pmtiles}-raw.pmtiles"
JAR="data/planetiler.jar"
JAVA_OPTS="${JAVA_OPTS:--Xmx4g}"

mkdir -p data/sources out
if [ ! -f "$JAR" ]; then
  echo "planetiler.jar татаж байна…"
  curl -L -o "$JAR" https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar
fi

java $JAVA_OPTS -jar "$JAR" generate-custom \
  --schema=planetiler/metacity.yml \
  --download \
  --bounds="$BBOX" \
  --minzoom=6 --maxzoom="${MAXZOOM:-15}" \
  --output="$RAW" \
  --force

# Нэршил цэвэрлэх (монгол бичгийн тэмдэгт хасах) → эцсийн архив
pnpm exec tsx src/cli.ts normalize "$RAW" "$OUT"

mkdir -p ../../apps/web/public/tiles
cp "$OUT" ../../apps/web/public/tiles/ub.pmtiles
pnpm exec tsx src/cli.ts search-index "$OUT" ../../apps/web/public/data/search-index.json
echo
echo "Бэлэн: apps/web/public/tiles/ub.pmtiles"
echo "Апп-д ашиглах: apps/web/.env → VITE_TILES=tiles/ub.pmtiles"
