#!/usr/bin/env bash
# planetiler схемийн синтакс + examples-ийг OSM өгөгдөлгүйгээр шалгана.
set -euo pipefail
cd "$(dirname "$0")/.."
JAR="data/planetiler.jar"
[ -f "$JAR" ] || curl -L -o "$JAR" https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar
java -jar "$JAR" verify-schema --schema=planetiler/metacity.yml --spec=planetiler/metacity.spec.yml "$@"
