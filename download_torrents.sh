#!/usr/bin/env bash

export qbtUrl=""
qbtLogin=""
qbtPassword=""

export BROWSER_DOWNLOAD_DIR=""
export TORRENT_DOWNLOAD_DIR=""

# given a qbittorrent web ui url, create bash function to send sychronously curl request to authenticate, then save cookies for re-usage nto a variable

qbt_login() {
    local url="$1"
    local user="$2"
    local pass="$3"

    # qBittorrent requires the 'Referer' header for all API calls
    # We extract the 'Set-Cookie' header, specifically the 'SID=' part
    QBT_COOKIE=$(curl -s -i --header "Referer: $url" \
        --data "username=$user&password=$pass" \
        "$url/api/v2/auth/login" | grep -o 'SID=[^;]*')

    if [ -n "$QBT_COOKIE" ]; then
        echo "Successfully authenticated. Cookie saved."

    else
        echo "Login failed. Check your credentials or URL."
        return 1
    fi
}


# create a function that consumes qbittorrent web ui cookies from $QBT_COOKIE and sends sync curl request to download torrent from a disk path into a specific folder
qbt_add_torrent() {
    local url="$1"         # e.g., "http://192.168.1.100:8080"
    local file_path="$2"   # e.g., "/home/user/downloads/linux.torrent"
    local save_path="$3"   # e.g., "/media/storage/movies"

    if [[ -z "$QBT_COOKIE" ]]; then
        echo "Error: QBT_COOKIE is not set. Please log in first."
        return 1
    fi

    # --form "torrents=@path" uploads the local file via multipart/form-data
    # savepath (or save_path in newer versions) specifies the destination
    curl -s -X POST \
        --header "Referer: $url" \
        --cookie "$QBT_COOKIE" \
        --form "torrents=@$file_path" \
        --form "savepath=$save_path" \
        --form "paused=true" \
        "$url/api/v2/torrents/add"

    if [[ $? -eq 0 ]]; then
        echo "Torrent upload request sent successfully."
    else
        echo "Failed to send request."
    fi
}

qbt_login "${qbtUrl}" "${qbtLogin}" "${qbtPassword}"

cd "${BROWSER_DOWNLOAD_DIR}" || exit 1
while IFS="" read line
    do
    torrentFileName="$( echo "${line}" | awk -F'\t' '{ print $10}' )";
    galleryId="${torrentFileName%.*}";
    downloadTitle="$( echo "${line}" | awk -F'\t' '{ print $9}' )";
    # qbt_add_torrent "${qbtUrl}" "${torrentFileName}" "$(realpath "${TORRENT_DOWNLOAD_DIR}")/${downloadTitle} [${galleryId}]";
    qbt_add_torrent "${qbtUrl}" "${torrentFileName}" "${TORRENT_DOWNLOAD_DIR}";
    done < "exhentai_galleries.tsv"

echo Done

# rm -fv "exhentai_galleries.tsv" *.torrent
