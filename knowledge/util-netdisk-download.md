---
name: netdisk-download
description: Download files from cloud storage / netdisk share links in TRAM. Supports Cloudreve share links. Use when users provide a cloud storage URL or need to download modpack files from Chinese cloud storage services.
---

# netdisk_download — 网盘/云存储下载

`netdisk_download` downloads files from cloud storage / netdisk share links. Currently supports Cloudreve (`http(s)://domain/s/{shareId}`).

- Just pass the share URL directly — auto-resolves to real download URL
- Works with any Cloudreve instance (any domain with `/s/{id}` path)
- **When user wants a file but has no link**: search online (Chinese + English) first, present found links, then download
- Commonly used for downloading modpack files from Chinese cloud storage services
