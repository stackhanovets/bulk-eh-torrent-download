#!/usr/bin/env bash

rm -fv "exhentai_galleries.tsv"

# Create table from already downloaded torrents
find \
    "$(pwd)" \
    -maxdepth 1 \
    -name "*.torrent" \
    -type f \
    -exec printf "\t\t\t\t\t\t\t\t\t$(basename {})\n" >> "exhentai_galleries.tsv" \;
