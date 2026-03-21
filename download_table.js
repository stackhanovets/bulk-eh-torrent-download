// Copy into the browser console while logged in

const DOMAIN = "exhentai"
const SLEEP_SECONDS = 10


function sleep(millis)
{
    var date = new Date();
    var curDate = null;
    while(curDate - date < millis) {
      curDate = new Date();
    }
}

// I have a URL 'https://example.org/aaa/bbb/ccc/'
// Write a function to extract `bbb` & `ccc` and return them as an UrlIdDto object w/ fields 'id1' & 'id2' respectively

class UrlIdDto {
  constructor(id1, id2) {
    this.id1 = id1;
    this.id2 = id2;
  }
}

function extractUrlIds(urlStr) {
  // 1. Parse the URL and get the path (e.g., "/aaa/bbb/ccc/")
  const url = new URL(urlStr);
  
  // 2. Split by '/' and remove empty strings from leading/trailing slashes
  const segments = url.pathname.split('/').filter(Boolean);

  // 3. Extract based on known positions
  const id1 = segments[1]; // Index 1 is the 2nd part
  const id2 = segments[2]; // Index 2 is the 3rd part

  return new UrlIdDto(id1, id2);
}

// write a simple yet synchronous js function that consumes a url and returns a response body html in a get request

function getHTMLSync(url) {
  const xhr = new XMLHttpRequest();
  
  // The 'false' argument makes the request synchronous
  xhr.open("GET", url, false); 
  
  try {
    xhr.send(null);

    if (xhr.status === 200) {
      return xhr.responseText;
    } else {
      console.error(`Error: ${xhr.status} ${xhr.statusText}`);
      return null;
    }
  } catch (error) {
    console.error("Network or CORS error:", error);
    return null;
  }
}

function extractTitle(htmlString) {
  // 1. Create a new DOMParser instance
  const parser = new DOMParser();
  
  // 2. Parse the string into a temporary document
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // 3. Select the title element and return its text content
  const titleElement = doc.querySelector('title');
  const rawTitle = titleElement ? titleElement.textContent : "";
  const processedTitle = rawTitle.replace(" - ExHentai.org", "").replace(" - E-Hentai.org", "");
  return processedTitle;
}

// I have an html document with multiple tables. 

// Each table must have exactly 3 rows in the body, otherwise it is defective. 

// The first row example: <tr>  <td style="width:180px"><span style="font-weight:bold">Posted:</span> <span>2021-11-11 11:11</span></td>  <td style="width:150px"><span style="font-weight:bold">Size:</span> 11.11 MiB</td>  <td></td>  <td style="width:80px"><span style="font-weight:bold">Seeds:</span> 11</td>  <td style="width:80px"><span style="font-weight:bold">Peers:</span> 0</td>  <td style="width:100px; text-align:center"><span style="font-weight:bold">Downloads:</span> 11</td> </tr>

// The 2nd row example: <tr>  <td colspan="5"><span style="font-weight:bold">Uploader:</span> meeee</td>   <td rowspan="2" style="width:100px; text-align:center"><input type="submit" name="torrent_info" value="Information" style="width:80px"></td> </tr>

// The 3rd row example: <tr>  <td colspan="5"> &nbsp; <a href="https://example.org/fake-path.torrent" onclick="document.location='https://example.org/real-path.torrent'; return false">Download Name</a></td> </tr>

// I need the values: string posted, int size, int seeds, int peers, int downloads, string uploader, string url, string name

// The URL field must be extracted from  `(for onclick="document.location='...')`

// The size must be parsed as float and converted into bytes as it can contain MiB, GiB and KiB

// The name field must contain the download name from the <a> tag.

// Write a function that locates the values and returns the special TorrentDto class instance that contains them.

// All the parsing logic must be into this function, as the DTO class by design must only store data


class TorrentDto {
  constructor(posted, size, seeds, peers, downloads, uploader, url, name, header, torrentFile) {
    this.posted = posted;
    this.size = size; // This will be the total bytes (Integer)
    this.seeds = seeds;
    this.peers = peers;
    this.downloads = downloads;
    this.uploader = uploader;
    this.url = url;
    this.name = name;
    this.header = header;
    this.torrentFile = torrentFile;
  }

  toString() {
    return `${this.posted}\t${this.size}\t${this.seeds}\t${this.peers}\t${this.downloads}\t${this.uploader}\t${this.url}\t${this.name}\t${this.header}\t${this.torrentFile}`;
  }
}

function parseTorrentData(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const tables = doc.querySelectorAll("table");
  const results = [];

  // Helper to convert size string (e.g., "59.88 MiB") to bytes
  const toBytes = (str) => {
    const units = { "KiB": 1024, "MiB": 1024**2, "GiB": 1024**3, "TiB": 1024**4 };
    const match = str.match(/([\d.]+)\s*([KMGT]iB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return Math.floor(value * (units[unit] || 1));
  };

  tables.forEach((table) => {
    const rows = table.querySelectorAll("tr");

    // Validate exactly 3 rows
    if (rows.length !== 3) return;

    try {
      const header = doc.querySelector("h1").textContent.trim();

      const [r1, r2, r3] = rows;

      // Row 1 Extraction (using .textContent to strip label tags)
      const posted = r1.cells[0].querySelector("span:nth-child(2)").textContent.trim();
      const sizeBytes = toBytes(r1.cells[1].textContent);
      const seeds = parseInt(r1.cells[3].textContent.replace("Seeds:", "")) || 0;
      const peers = parseInt(r1.cells[4].textContent.replace("Peers:", "")) || 0;
      const downloads = parseInt(r1.cells[5].textContent.replace("Downloads:", "")) || 0;

      // Row 2 Extraction
      const uploader = r2.cells[0].textContent.replace("Uploader:", "").trim();

      // Row 3 Extraction: Regex for document.location='...'
      const anchor = r3.querySelector("a");
      const onclick = anchor ? anchor.getAttribute("onclick") : "";
      const urlMatch = onclick.match(/document\.location\s*=\s*'([^']+)'/);
      const url = urlMatch ? urlMatch[1] : null;
      const name = anchor ? anchor.textContent.trim() : "";

      results.push(new TorrentDto(
        posted,
        sizeBytes,
        seeds,
        peers,
        downloads,
        uploader,
        url,
        name,
        header,
        ""
      ));
    } catch (e) {
      // Skip table if internal elements (like spans or anchors) are missing
    }
  });

  return results;
}

// Given the output torrentDtoList, sort the objects by the `size` field. Return the largest object that has peers number larger than 0.

function chooseTorrentData(torrentDtoList) {
    const largestWithSeeds = torrentDtoList
        .sort((a, b) => b.size - a.size) // Sort descending (largest first)
        .find(torrent => torrent.seeds > 0); // Find the first one with seeds > 0
    return largestWithSeeds;
}

// Write a function that takes a URL and a file name and downloads the binary file data synchronously using that name via XHR request
// The server may return file type of `x-bittorrent` and `html`, the latter is considered error.
// Only if the data has type of `x-bittorrent`, download it and return the input file name.

function downloadFileSync(url, fileName) {
    const xhr = new XMLHttpRequest();
    
    // 1. Open synchronously
    xhr.open("GET", url, false);
    
    // 2. Force the browser to treat the response as raw binary data
    xhr.overrideMimeType("text/plain; charset=x-user-defined");

    try {
        xhr.send();

        if (xhr.status === 200) {
            // 3. Convert the binary string to a Uint8Array
            const binStr = xhr.responseText;
            const len = binStr.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
                bytes[i] = binStr.charCodeAt(i) & 0xff;
            }

            // 4. Create the Blob and trigger the download
            const blob = new Blob([bytes], { type: "application/octet-stream" });
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // 5. Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            console.log("Synchronous download finished:", fileName);
        }
    } catch (e) {
        console.error("Sync download failed (CORS or Network error):", e);
    }
}

function getGalleryDownloadDto(galleryUrl) {
    const galleryUrlDto = extractUrlIds(galleryUrl);

    const galleryBody = getHTMLSync(galleryUrl);
    const galleryTitle = extractTitle(galleryBody);

    const galleryTorrentsPageBody = getHTMLSync(`https://${DOMAIN}.org/gallerytorrents.php?gid=${galleryUrlDto.id1}&t=${galleryUrlDto.id2}`);
    const galleryTorrentDtoList = parseTorrentData(galleryTorrentsPageBody);
    const galleryTorrentDto = chooseTorrentData(galleryTorrentDtoList);
    
    if (galleryTorrentDto) {
        galleryTorrentDto.torrentFile = `${galleryUrlDto.id1}.torrent`;
        return galleryTorrentDto;
    }
}

// Given a web page string, extract and return all links like 'https://example.org/a/bbb/ccc/', where 'bbb' & 'ccc' do vary

function extractSpecificLinks(htmlString) {
  // Regex: 
  // [^/]+ matches one or more characters that are NOT a slash
  // /g flag ensures it finds all matches in the string
  const regex = /https:\/\/exhentai\.org\/g\/[^/]+\/[^/]+\//g;
  
  const matches = htmlString.match(regex) || [];
  
  // Return unique matches only
  return [...new Set(matches)];
}

// Given a web page string, write a function to extract the URL or return null if element like this does not exist: `<div><a id="unext" href="https://example.org/go.php?next=111-222">Next &gt;</a></div>`

function extractNextUrl(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Target the specific ID assigned to the anchor
  const nextAnchor = doc.getElementById("unext");

  // Return the href if it exists, otherwise null
  return nextAnchor ? nextAnchor.getAttribute("href") : null;
}


function getFavoriteGalleryUrls(url) {
    const favoritePageBody = getHTMLSync(url);
    let links = extractSpecificLinks(favoritePageBody);
    const nextUrl = extractNextUrl(favoritePageBody);
    // const nextUrl = null;
    // Recurse point
    if (nextUrl) {
        const links2 = getFavoriteGalleryUrls(nextUrl);
        links = links.concat(links2);
    }
    return links
}


function downloadString(content, fileName) {
  // 1. Create a Blob from the string
  const blob = new Blob([content], { type: 'text/plain' });

  // 2. Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // 3. Create a hidden link and trigger the click
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // 4. Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// use the main favs page
const rootFavoriteGalleryUrl = `https://${DOMAIN}.org/favorites.php`;
// then get all favorite galleries recursive
const favoriteGalleryUrls = new Set(getFavoriteGalleryUrls(rootFavoriteGalleryUrl));

// Parse the torrent download page, download torrent and prepare gallery table rows
// The torrent link invalidation time seems to be pretty short, so the related torrent file has to be downloaded ASAP
// The qBittorrent will deduplicate the torrent downloads later
const galleryDownloadTableRows = [];
favoriteGalleryUrls.forEach (function(url) {
    galleryDownloadDto = getGalleryDownloadDto(url);
    if (galleryDownloadDto) {
        sleep(SLEEP_SECONDS * 1000);
        downloadFileSync(galleryDownloadDto.url, galleryDownloadDto.torrentFile);
        const galleryDownloadString = galleryDownloadDto.toString();
        galleryDownloadTableRows.push(galleryDownloadString);
    }
})

// Download torrent data table
const galleryDownloadTableString = galleryDownloadTableRows.join("\r\n");
const galleryBasename = "exhentai_galleries.tsv";
downloadString(galleryDownloadTableString, galleryBasename);
