---
name: minecraft-server-tools
description: Tools for querying Minecraft server information via MCJars API, including version lists, server downloads, Java requirements, and hash-based server lookup. Use when the user needs information about Minecraft game versions, server deployment details, or wants to identify servers by file hash.
license: Apache-2.0
applyTo:
  - "**/*minecraft*"
  - "**/*mc*"
  - "**/*server*"
---

# Minecraft Server Information Tools

This skill provides comprehensive tools for retrieving and managing Minecraft server information through the MCJars API. The `minecraft_server_info` tool is LM-only and enables querying game versions, server downloads, Java requirements, and hash-based server identification.

## Overview

The MCJars API provides reliable access to Minecraft server JAR files, version information, and deployment requirements. This tool is essential for:

- Finding the latest Minecraft game versions and snapshots
- Downloading specific server implementations (Paper, Purpur, Spigot, Bukkit)
- Checking Java version compatibility for different server versions
- Identifying servers by their file hash (SHA256)

## Tool: `minecraft_server_info`

**Type**: LM-only (Language Model exclusive)  
**API**: MCJars API v1  
**Base URL**: `https://api.mcjars.app`

### Available Actions

#### 1. `list-versions` - Get Latest Game Versions

Retrieve a list of the most recent Minecraft game versions.

**Parameters**:
- `action`: `"list-versions"` (required)

**Returns**:
- Latest 20 versions with release status and timestamps
- Distinguishes between release versions and snapshots

**Example Usage**:
```
User: "What are the latest Minecraft versions?"
→ Tool call: minecraft_server_info { action: "list-versions" }
→ Returns: [
    { version: "1.20.4", release: true, releaseTime: "2024-03-28T..." },
    { version: "1.20.3", release: true, releaseTime: "2024-02-07T..." },
    ...
  ]
```

**Use Cases**:
- Check available versions for server deployment
- Verify if a specific version has been released
- Track new snapshots and pre-releases

---

#### 2. `get-server-info` - Get Server Download Details

Retrieve server download links, file hashes, and Java requirements for a specific version.

**Parameters**:
- `action`: `"get-server-info"` (required)
- `gameVersion`: `string` (required) - e.g., "1.20.1"
- `serverType`: `string` (optional) - one of: "paper", "purpur", "spigot", "bukkit" (defaults to "paper")

**Returns**:
- Server name and type
- Game version
- Direct download URL
- SHA256 file hash
- Java version requirements
- Minimum and recommended RAM requirements

**Example Usage**:
```
User: "I need to set up a 1.20.1 Paper server. What Java version does it need?"
→ Tool call: minecraft_server_info { 
    action: "get-server-info", 
    gameVersion: "1.20.1", 
    serverType: "paper" 
}
→ Returns: {
    name: "paper",
    version: "1.20.1",
    downloadUrl: "https://...",
    sha256: "abc123...",
    javaVersion: "Java 17+",
    minRam: 2048,
    recommendedRam: 4096
}
```

**Use Cases**:
- Get direct download links for server JAR files
- Determine Java version compatibility before installation
- Check RAM requirements for server planning
- Verify server file integrity with SHA256 hash
- Identify specific server software builds

---

#### 3. `get-java-requirements` - Get Java Version Support Matrix

Query the Java version compatibility for a Minecraft game version.

**Parameters**:
- `action`: `"get-java-requirements"` (required)
- `gameVersion`: `string` (required) - e.g., "1.20"

**Returns**:
- Minimum required Java version
- Recommended Java version for optimal performance
- End-of-Life (EOL) status for the version

**Example Usage**:
```
User: "Which Java version should I use for Minecraft 1.20?"
→ Tool call: minecraft_server_info { 
    action: "get-java-requirements", 
    gameVersion: "1.20" 
}
→ Returns: {
    version: "1.20",
    minJava: "Java 17",
    recommendedJava: "Java 21",
    eol: false
}
```

**Use Cases**:
- Verify Java compatibility before server deployment
- Plan Java version upgrades for newer Minecraft releases
- Identify EOL versions that need migration
- Check minimum system requirements

**Java Version Mapping**:
| Version | Min Java | Recommended | Status |
|---------|----------|-------------|--------|
| 1.20+ | Java 17 | Java 21 | Active |
| 1.19 | Java 17 | Java 19 | Active |
| 1.18 | Java 16 | Java 17 | Active |
| 1.17 | Java 16 | Java 16 | EOL |
| 1.16 | Java 8 | Java 11 | EOL |
| 1.12 | Java 8 | Java 8 | EOL |

---

#### 4. `get-by-hash` - Find Server by File Hash

Identify a Minecraft server JAR file by its SHA256 hash. Useful for determining what server software a file is when you have only the binary.

**Parameters**:
- `action`: `"get-by-hash"` (required)
- `hash`: `string` (required) - SHA256 hash (64 hexadecimal characters)

**Returns**:
- Server type (Paper, Purpur, Spigot, Bukkit, etc.)
- Game version
- Build number
- Release timestamp
- Download URL (if available)

**Example Usage**:
```
User: "I have a server JAR with hash abc123def456... Can you tell me what it is?"
→ Tool call: minecraft_server_info { 
    action: "get-by-hash", 
    hash: "abc123def456..." 
}
→ Returns: {
    hash: "abc123def456...",
    name: "paper",
    type: "paper",
    version: "1.20.1",
    build: 123,
    releaseTime: "2024-01-15T00:00:00Z"
}
```

**Use Cases**:
- Identify mystery server JAR files
- Verify server software authenticity
- Check if you have the right version/build
- Audit server deployment
- Find build numbers for dependency management

**Hash Validation**:
- Accepts SHA256 hashes in lowercase or uppercase
- Validates format before API call (must be 64 hex characters)
- Returns clear error if hash is invalid or not found

---

## Decision Guide

Use this decision tree to select the right action:

```
Do you need to know about game versions?
  ├─ YES → use get-latest-versions
  │
  └─ NO → Do you have a specific game version?
       ├─ YES → Do you need Java info?
       │  ├─ YES → use get-java-requirements
       │  └─ NO → Do you need download/server info?
       │      ├─ YES → use get-server-info
       │      └─ NO → (clarify user intent)
       │
       └─ NO → Do you have a file hash?
            ├─ YES → use get-by-hash
            └─ NO → ask user for version or hash
```

---

## Best Practices

### When Using `list-versions`
- ✅ Use to find the latest stable releases
- ✅ Check for new versions before planning updates
- ❌ Don't assume all listed versions are still available to download
- 📝 Note: Snapshots may have limited availability

### When Using `get-server-info`
- ✅ Always note the Java version requirement before installation
- ✅ Use the SHA256 hash to verify downloaded files
- ✅ Check RAM requirements for server planning
- ❌ Don't use without specifying the version
- 📝 Paper is usually the default choice if serverType isn't specified

### When Using `get-java-requirements`
- ✅ Check before upgrading Java versions
- ✅ Verify compatibility with existing infrastructure
- ✅ Plan migrations for EOL versions
- ❌ Don't assume newer Java is always better
- 📝 Recommended version is usually for production use

### When Using `get-by-hash`
- ✅ Verify server file authenticity
- ✅ Identify servers in bulk deployments
- ✅ Check build numbers for security patches
- ❌ Don't share hashes of sensitive files
- 📝 Hash is case-insensitive internally

---

## Common Workflows

### Workflow 1: Set Up a New Server

```
1. User asks: "I want to set up a 1.20.4 server"
2. Call: get-server-info { gameVersion: "1.20.4", serverType: "paper" }
3. Get: Download URL, Java requirement, RAM needs
4. User downloads and verifies with provided SHA256
5. User verifies Java: get-java-requirements { gameVersion: "1.20.4" }
6. Deployment ready!
```

### Workflow 2: Verify Server File Identity

```
1. User has a server.jar file, wants to know its identity
2. User/System calculates SHA256 of server.jar
3. Call: get-by-hash { hash: "calculated_sha256" }
4. Get: Server software type, version, build number
5. Verify authenticity and security status
```

### Workflow 3: Plan Version Upgrade

```
1. User asks: "Can I upgrade my 1.19 server to 1.20?"
2. Call: get-java-requirements { gameVersion: "1.19" }
   and get-java-requirements { gameVersion: "1.20" }
3. Compare Java requirements
4. Call: get-server-info { gameVersion: "1.20" }
5. Plan upgrade with full information
```

### Workflow 4: Check Latest Available Versions

```
1. User asks: "What's the latest Minecraft version?"
2. Call: list-versions
3. Get: Top 20 versions with dates
4. Present stable vs snapshot information
5. Help user choose version for deployment
```

---

## API Information

**MCJars API v1 Endpoints**:

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/versions` | List all available versions |
| `GET /v1/{type}/{version}` | Get server info (type: paper, purpur, spigot, bukkit) |
| `GET /v1/hash/{hash}` | Find server by SHA256 hash |

**Documentation**: https://mcjars.app/

---

## Error Handling

The tool provides clear error messages:

- **Version Not Found**: "No paper server available for version X.X.X"
- **Invalid Hash**: "hash must be a valid SHA256 hash (64 hexadecimal characters)"
- **Hash Not Found**: "No Minecraft server JAR found for hash..."
- **API Errors**: Network issues or server unavailability

---

## Integration Notes

- Tool is marked `isLmOnly: true` - only accessible to language models
- All outputs are structured JSON for programmatic use
- Human-readable display text is also provided
- Automatic fallback handling for missing/optional fields
- Comprehensive input validation before API calls

