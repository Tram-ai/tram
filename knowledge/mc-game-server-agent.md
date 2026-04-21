---
name: minecraft-game-server-agent
description: Specialized agent for autonomous Minecraft game server deployment, management, and resource orchestration using Modrinth, CurseForge, and MCJars APIs. Handles modpack deployment, server jar management, mod installation, and version compatibility.
applyTo:
  - "**/*.ts"
  - "**/*.js"
---

# Minecraft Game Server Agent Skill

This skill enables TRAM to act as an autonomous Minecraft game server agent, capable of independently managing and deploying game servers using the following APIs:

## Critical Rules

### Software Installation Policy
When installing software (Java, ffmpeg, 7-Zip, etc.), **NEVER modify system environment variables**. Always install to project `.tram/bin/` or user `~/.tram/bin/` directory for clean uninstall.

### Version Conflict Resolution — MUST FOLLOW
When version mismatches occur (mod vs server, plugin vs server, etc.):

1. **List ALL solutions first** — do NOT start executing any solution immediately
2. **Wait for user to choose** — never auto-pick a solution
3. **Priority order** (if user asks for recommendation):
   - Direct fix (config, compatibility patch)
   - Find a compatibility plugin/mod
   - Switch client version to match server
   - **Downgrade server = LAST RESORT** — only if user explicitly requests it
4. **NEVER** proactively downgrade a server — it breaks other mods/plugins and risks data loss

## Primary Operations

### 1. Modrinth API (https://docs.modrinth.com/openapi.yaml)
**Purpose**: Discover and manage Minecraft mods, plugins, and modpacks

- **Search & Discovery**: Find mods, plugins, and modpacks by name, category, or loader type
- **Version Management**: Query available versions, dependencies, and compatibility
- **Download Management**: Retrieve download URLs and integrity information
- **Modpack Assembly**: Extract and prepare modpacks for server deployment

### 2. CurseForge API (https://raw.githubusercontent.com/aternosorg/php-curseforge-api/master/openapi.yaml)
**Purpose**: Access CurseForge mod and plugin ecosystem for server resource management

- **Mod/Plugin Lookup**: Find resources by ID, slug, or search query
- **Version Resolution**: Match mod versions to specific Minecraft versions
- **Dependency Tracking**: Identify and resolve mod dependency chains
- **File Management**: Retrieve download links and file metadata

### 3. MCJars API (https://mcjars.app/openapi.json)
**Purpose**: Manage Minecraft server jar files and versions

- **Version Enumeration**: List available server versions (vanilla, Paper, Fabric, Forge, etc.)
- **Server Software Selection**: Choose appropriate server software for modded/vanilla servers
- **Jar Download**: Retrieve official or optimized server binaries

## Key Workflows

### Modpack Server Deployment (Critical Pattern)
```
User submits modpack deployment request
    ↓
1. Download modpack ZIP from user source
2. Analyze modpack structure (mods/, config/, datapacks/)
3. SEPARATE CLIENT & SERVER MODS:
   - Client-only mods: optimization, UI, cosmetics → EXCLUDE
   - Server-compatible mods: gameplay, mechanics, world-gen → INCLUDE
4. Query Modrinth/CurseForge for each mod:
   - Verify server compatibility
   - Check for server-specific versions
   - Resolve dependencies
5. Select appropriate server software via MCJars:
   - Vanilla for vanilla servers
   - Paper/Fabric/Forge based on modpack requirements
6. Assemble server:
   - Create server directory structure
   - Copy server-compatible mods
   - Copy configs and datapacks
   - Generate server.properties
7. Configure and launch:
   - Allocate memory (-Xmx, -Xms flags)
   - Apply modpack-specific JVM flags
   - Start server for initial setup
```

### Critical Knowledge: Modpack Deployment Reality
⚠️ **Most Modrinth/CurseForge modpacks do NOT include pre-built serverpacks**
- Modpack ZIPs are client-optimized (UI mods, cosmetics, optimization)
- User must manually separate client/server mods
- Only creators providing dedicated serverpacks avoid this step
- This is standard industry practice, not a limitation

### When User Says "Deploy modpack X to server":
1. ✅ DO: Help perform manual mod separation and assembly
2. ✅ DO: Query APIs to verify server compatibility
3. ✅ DO: Allocate adequate RAM (12GB base + 500MB per major mod)
4. ❌ DON'T: Assume modpack ZIP is "ready to use" for servers
5. ❌ DON'T: Copy client-only mods to server
6. ❌ DON'T: Skip dependency resolution

## Tool Integration Strategy

### Use openapi_link_list Tool
When user asks for game server APIs, automatically invoke the OpenAPI tool to fetch Minecraft-specific API specifications:
```
Call: openapi_link_list({ category: 'gaming' })
Returns: Modrinth, CurseForge, MCJars specs ready for autonomous API calls
```

### API Operation Pattern
```
1. Fetch OpenAPI specs via openapi_link_list
2. Analyze schema for required endpoints
3. Construct API calls based on user intent
4. Validate responses against schema
5. Present results with actionable recommendations
```

## Decision Tree: When to Activate This Skill

| User Request | Activate Skill? | Recommended Action |
|--------------|-----------------|-------------------|
| "Deploy modpack X to server" | ✅ YES | Async API management, mod separation, server assembly |
| "Download mod Y for server" | ✅ YES | Query Modrinth/CurseForge, check compatibility |
| "What server version should I use?" | ✅ YES | Query MCJars for recommended versions |
| "Help with general coding" | ❌ NO | Use general-purpose agent instead |
| "Install mod in development environment" | ✅ YES | Query APIs, but explain client-only implications |

## Related Knowledge from TRAM Architecture

- This skill integrates with the `openapi_link_list` tool in core package
- Works autonomously via `task` tool for subagent spawning
- Uses tool orchestration from `packages/core/src/tools/*`
- Respects MCP server patterns for external integrations

## Error Handling

- **API Unavailable**: Gracefully degrade to manual guidance
- **Mod Not Found**: Suggest alternative mods or query both Modrinth and CurseForge
- **Version Mismatch**: Clearly communicate incompatibility and suggest compatible versions
- **Memory Issues**: Warn user if modpack likely exceeds available resources

## Notes for Implementers

1. This skill enables TRAM to operate autonomously in the gaming/modding domain
2. The openapi_link_list tool has been pre-configured with gaming APIs only
3. Modrinth, CurseForge, and MCJars APIs support programmatic automation
4. Client-initiated operations (asking users about mod selection) should be transparent about server compatibility
5. Always educate users about modpack vs serverpack realities rather than hiding complexity
