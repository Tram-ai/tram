import { execSync } from "child_process";
import { cpSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rootDist = join(root, "dist");
const publishDir = join(root, "npm-publish");
const publishDist = join(publishDir, "dist");

// 1. Run bundle
console.log("📦 Running bundle...");
execSync("npm run bundle", { cwd: root, stdio: "inherit" });

// 2. Clean old dist in npm-publish
console.log("🧹 Cleaning old npm-publish/dist...");
rmSync(publishDist, { recursive: true, force: true });

// 3. Copy dist to npm-publish/dist
console.log("📁 Copying dist to npm-publish/dist...");
cpSync(rootDist, publishDist, { recursive: true });

// 4. Log in to npm
console.log("🔑 Logging in to npm...");
execSync("npm login", { cwd: publishDir, stdio: "inherit" });

// 5. Publish
console.log("🚀 Publishing package...");
execSync("npm publish --access public", { cwd: publishDir, stdio: "inherit" });

console.log("✅ Publish complete!");
