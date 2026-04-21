---
name: minecraft-tools
description: Tools for querying Minecraft server information via MCJars API, including version lists, server downloads, Java requirements, and hash-based server lookup. Use when the user needs information about Minecraft game versions, server deployment details, or wants to identify servers by file hash.
license: Apache-2.0
allowedTools:
  - minecraft_server_info
---

# Minecraft Server Information Tools

This skill provides comprehensive tools for retrieving and managing Minecraft server information through the MCJars API. The `minecraft_server_info` tool is LM-only and enables querying game versions, server downloads, Java requirements, and hash-based server identification.

## Quick Reference

| Action | Use When | Key Parameters |
|--------|----------|-----------------|
| **list-versions** | Need latest game versions | `serverType` (optional) |
| **get-server-info** | Deploy a server to specific version | `gameVersion`, `serverType` |
| **get-java-requirements** | Check Java compatibility | `gameVersion` |
| **get-by-hash** | Identify a server JAR file | `hash` (SHA256) |

> **Important:** `get-server-info` returns build/download info. It does NOT reliably return Java version requirements. To get the required Java version for a game version, always use `get-java-requirements` instead.

## Action: list-versions

Get the latest 20 Minecraft game versions with release status.

**When to use**:
- User asks "What are the latest Minecraft versions?"
- Need to check if specific version is available
- Planning server deployment

**Example**:
```
User: "What's the latest Minecraft version?"
→ minecraft_server_info { action: "list-versions" }
→ Returns: Latest 20 versions with release dates
```

**Output fields**:
- `version`: Version number (e.g., "1.20.4")
- `release`: Boolean (true = release, false = snapshot)
- `releaseTime`: ISO timestamp

---

## Action: get-server-info

Get server download details, Java requirements, and specifications for a specific version.

**When to use**:
- User wants to set up/deploy a server
- Need download link and file hash
- Check Java version compatibility
- Determine RAM requirements

**Required parameters**:
- `gameVersion`: Minecraft version (e.g., "1.20.1")

**Optional parameters**:
- `serverType`: "paper" (default), "purpur", "spigot", or "bukkit"

**Example**:
```
User: "Help me set up a Paper server for 1.20.4"
→ minecraft_server_info { 
    action: "get-server-info", 
    gameVersion: "1.20.4", 
    serverType: "paper" 
}
→ Returns: Download URL, SHA256, Java 17+, min RAM 2GB, recommended 4GB
```

**Output fields**:
- `build`: Complete build object from MCJars API (includes `name`, `buildNumber`, `jarUrl`, `jarSize`, `installation`, `changes`, `created`)
- `javaVersion`: Java version string (fetched from v2 API, e.g. "Java 21")

**Best practices**:
- ✅ Always use `get-java-requirements` to check Java compatibility before deployment
- ✅ Suggest verifying SHA256 hash after download
- ✅ Note RAM requirements in server planning
- ❌ Don't assume all versions have all server types available

---

## Action: get-java-requirements

Query the MCJars API for Java version compatibility for a Minecraft version.

**When to use**:
- User asks "What Java version for..."
- Need to know Java requirements before deploying a server
- Planning Java upgrades
- Checking support status
- Verifying system compatibility
- **Preferred over `get-server-info` for Java version info**

**Required parameters**:
- `gameVersion`: Minecraft version (e.g., "1.20")

**Example**:
```
User: "Can my server running Java 8 run Minecraft 1.20?"
→ minecraft_server_info { action: "get-java-requirements", gameVersion: "1.20" }
→ Returns: Min Java 17, Recommended Java 21, Status: Active
→ Response: "No, 1.20 requires minimum Java 17. Your Java 8 is too old."
```

**Output fields**:
- `version`: Game version
- `minJava`: Minimum Java version (from MCJars API)
- `recommendedJava`: Recommended Java version (from MCJars API)
- `eol`: Boolean (true = unsupported/end-of-life based on MCJars `supported` field)

> **Note:** Java requirements are now queried from the MCJars API in real-time. The tool no longer uses a hardcoded table, so it covers all versions the API knows about.

---

## Action: get-by-hash

Identify a Minecraft server JAR file by its SHA256 hash.

**When to use**:
- User has unknown server JAR and wants identification
- Verifying server software authenticity
- Auditing server files
- Finding build numbers

**Required parameters**:
- `hash`: SHA256 hash string (64 hexadecimal characters, case-insensitive)

**Example**:
```
User: "I have a server JAR with hash abc123def456... What is it?"
→ minecraft_server_info { action: "get-by-hash", hash: "abc123def456..." }
→ Returns: Paper 1.20.1 build 123
```

**Output fields**:
- `hash`: The SHA256 hash provided
- `name`: Server software name
- `type`: Server type
- `version`: Game version
- `build`: Build number
- `releaseTime`: Release timestamp

**Hash notes**:
- ✅ Must be 64 hexadecimal characters
- ✅ Case-insensitive (internally normalized to lowercase)
- ✅ Copy from `ls -l` or file properties
- ❌ Invalid hashes will return clear error message

---

## Common Workflows

### Setup a New Server

```
1. User: "I want to set up a server" (no version specified)
   → Use list-versions to find the latest release version first.
   User: "I want to set up a 1.20.4 server" (version specified)
   → Use the specified version directly.
2. Get Java requirements:
   minecraft_server_info { action: "get-java-requirements", gameVersion: "<version>" }
3. Get deployment info:
   minecraft_server_info { action: "get-server-info", gameVersion: "<version>", serverType: "paper" }
4. Download server JAR to the current working directory.
5. Start server from the current working directory.
6. Provide user with: download link, SHA256, Java requirement, RAM needs
```

> **Default behaviors:**
> - If user does not specify a version, always use the **latest stable release**.
> - Server files are downloaded to and run from the **current working directory** unless user specifies another path.

### Upgrade Version

```
1. User: "I want to upgrade from 1.19 to 1.20"
2. Check current version requirements:
   minecraft_server_info { action: "get-java-requirements", gameVersion: "1.19" }
3. Check new version requirements:
   minecraft_server_info { action: "get-java-requirements", gameVersion: "1.20" }
4. Compare and advise on Java compatibility
5. If compatible, provide new server download info
```

### Identify Unknown JAR

```
1. User: "What server is this JAR?" (with hash)
2. lookup:
   minecraft_server_info { action: "get-by-hash", hash: "user_provided_hash" }
3. Return: identified server type, version, build
4. Optionally: list changes since that build
```

---

## Server Software Recommendations

**Paper** (Default)
- ✅ High performance and optimization
- ✅ Regular security updates
- ✅ Good plugin support
- ✅ Recommended for production
- Use for: Most servers and deployments

**Purpur**
- ✅ Extra configuration options
- ✅ Enhanced gameplay features
- ✅ Good for custom experiences
- Use for: Advanced customization

**Spigot**
- ✅ Stable and well-established
- ✅ Large community support
- ✅ Plugin compatibility
- Use for: Legacy systems, when strict compatibility needed

**Bukkit**
- ✅ Original plugin API
- ✅ Maximum compatibility
- Use for: Old plugins, backwards compatibility

---

## Common Questions

**Q: Which server software should I choose?**
A: Use Paper for most cases (high performance, security). Use Purpur for advanced customization, Spigot for stability, Bukkit for compatibility.

**Q: How do I verify the server JAR is authentic?**
A: Use the SHA256 hash from get-server-info, then:
```bash
sha256sum server.jar
# Compare output with tool response
```

**Q: My Java is older than required. What should I do?**
A: Upgrade Java to the recommended version for best performance, or minimum version to just run the server.

**Q: Can I identify any server JAR?**
A: MCJars database covers common servers. Custom or very old builds may not be found.

**Q: How often are new versions released?**
A: Check with list-versions. Snapshots come regularly, releases quarterly.

---

## Error Handling

Tool provides clear errors:
- ❌ "No paper server available for version X.X.X" → Version doesn't have that server type
- ❌ "hash must be a valid SHA256 hash" → Invalid hash format  
- ❌ "No Minecraft server JAR found for hash..." → Hash not in database
- ✅ Always explain error and suggest next steps

---

## Integration Tips

- Use these tools together for complete deployment info
- Always verify Java compatibility before deployment
- Recommend verifying SHA256 after download
- Reference Java version guide when discussing compatibility
- For multi-version operations, call tool once per version

