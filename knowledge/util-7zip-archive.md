---
name: 7zip-archive
description: 7-Zip archive operations in TRAM. Use for extracting modpack ZIPs, creating backups, and handling .7z/.rar/.tar.gz formats on Windows/Linux/macOS.
---

# 7-Zip 归档操作

TRAM includes built-in 7-Zip support:

- **Windows**: Portable `7zr.exe` in `.tram/bin/` (downloaded from https://www.7-zip.org/a/7zr.exe)
- **Linux/macOS**: System `p7zip` via package manager
- Use for extracting modpack ZIPs, creating backups, handling `.7z`/`.rar`/`.tar.gz` formats
- Windows command: `.tram/bin/7zr.exe x archive.zip -ooutput_dir`
