#!/usr/bin/env bash
# Download raw border datasets into pipeline/raw (git-ignored). Safe to re-run; skips files already present.
set -euo pipefail
RAW="$(dirname "$0")/raw"
mkdir -p "$RAW/hb"

get() { [ -s "$2" ] || { echo "fetch $1"; curl -sfL -o "$2" "$1"; }; }

# historical-basemaps (GPL-3.0): tier A slices up to 1880; 1900+ slices only supply period names for tier B
HB=https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson
for f in bc123000 bc10000 bc8000 bc5000 bc4000 bc3000 bc2000 bc1500 bc1000 bc700 bc500 bc400 bc323 bc300 bc200 bc100 bc1 \
         100 200 300 400 500 600 700 800 900 1000 1100 1200 1279 1300 1400 1492 1500 1530 \
         1600 1650 1700 1715 1783 1800 1815 1878 1880 \
         1900 1914 1920 1930 1938 1945 1960 1994 2000 2010; do
  get "$HB/world_$f.geojson" "$RAW/hb/world_$f.geojson"
done

# Tier B: CShapes 2.0 (CC BY-NC-SA 4.0), Gleditsch-Ward variant, via the CRAN package mirror
get https://raw.githubusercontent.com/cran/cshapes/master/inst/extdata/cshapes_2_gw.topojson.xz "$RAW/cshapes_gw.topojson.xz"
[ -s "$RAW/cshapes_gw.topojson" ] || xz -dk "$RAW/cshapes_gw.topojson.xz"

# Tier C: Natural Earth admin-0 50m (public domain)
get https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson "$RAW/ne_50m_admin0.geojson"
echo done
