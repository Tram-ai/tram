---
name: service-manage
description: Persistent service process management for TRAM. Use when launching, monitoring, restarting, or reading logs of long-running server processes (e.g. Minecraft servers).
---

# service_manage — 持久化服务进程管理

Use `service_manage` for all persistent server processes.

- Never launch Minecraft servers directly with shell when service management is expected
- Prefer registered services with monitoring and auto-restart
- For logs, use `action: "log"` with `name` and `tail` parameters. Logs are stored as variables (e.g., `$LOG_MC_SERVER_xxxx`)
- To read the full log content, use `read_file` with `absolute_path: "$LOG_MC_SERVER_xxxx"` — the variable name is resolved automatically
- Parameter names: `name` (not `serviceName`), `tail` (not `lines`)
- There is NO `outputMode` parameter — log variable storage is always automatic
