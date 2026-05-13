import * as path from "node:path";
import * as os from "node:os";

/**
 * Expands tilde and resolves relative paths to absolute.
 * Mirrors Storage.resolvePath() in packages/core.
 */
function resolvePath(dir: string): string {
  let resolved = dir;
  if (
    resolved === "~" ||
    resolved.startsWith("~/") ||
    resolved.startsWith("~\\")
  ) {
    const relativeSegments =
      resolved === "~"
        ? []
        : resolved
            .slice(2)
            .split(/[/\\]+/)
            .filter(Boolean);
    resolved = path.join(os.homedir(), ...relativeSegments);
  }
  if (!path.isAbsolute(resolved)) {
    resolved = path.resolve(resolved);
  }
  return resolved;
}

/**
 * Returns the global Tram home directory (config, credentials, etc.).
 *
 * Priority: TRAM_HOME env var > ~/.tram
 *
 * This mirrors packages/core Storage.getGlobalTramDir() without importing
 * from core to avoid cross-package dependencies.
 */
export function getGlobalTramDir(): string {
  const envDir = process.env["TRAM_HOME"];
  if (envDir) {
    return resolvePath(envDir);
  }
  const homeDir = os.homedir();
  return homeDir
    ? path.join(homeDir, ".tram")
    : path.join(os.tmpdir(), ".tram");
}
