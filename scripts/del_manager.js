import fs from "fs";
import path from "path";

const DEL_DIR = path.join(process.cwd(), ".del");
const MAPPING_FILE = path.join(DEL_DIR, "mapping.json");

function moveToDel(items) {
  if (!fs.existsSync(DEL_DIR)) {
    fs.mkdirSync(DEL_DIR, { recursive: true });
  }

  let mapping = {};
  if (fs.existsSync(MAPPING_FILE)) {
    mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf-8"));
  }

  items.forEach((item) => {
    const sourcePath = path.resolve(process.cwd(), item);
    if (fs.existsSync(sourcePath)) {
      const baseName = path.basename(item);
      // 添加时间戳防止同名文件冲突
      const uniqueName = Date.now() + "_" + baseName;
      const destPath = path.join(DEL_DIR, uniqueName);

      fs.renameSync(sourcePath, destPath);
      mapping[uniqueName] = sourcePath;
      console.log(`Moved: ${item} -> .del/${uniqueName}`);
    } else {
      console.log(`Not found (skipped): ${item}`);
    }
  });

  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

function restoreFromDel() {
  if (!fs.existsSync(DEL_DIR)) {
    console.log(".del directory does not exist.");
    return;
  }

  if (fs.existsSync(MAPPING_FILE)) {
    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf-8"));

    for (const [uniqueName, originalPath] of Object.entries(mapping)) {
      const sourcePath = path.join(DEL_DIR, uniqueName);
      if (fs.existsSync(sourcePath)) {
        // 确保上级目录存在
        const parentDir = path.dirname(originalPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.renameSync(sourcePath, originalPath);
        console.log(`Restored: .del/${uniqueName} -> ${originalPath}`);
      }
    }

    fs.unlinkSync(MAPPING_FILE);
  } else {
    console.log(
      "No mapping.json found, restoring to current directory by default.",
    );
    const items = fs.readdirSync(DEL_DIR);
    items.forEach((item) => {
      fs.renameSync(path.join(DEL_DIR, item), path.join(process.cwd(), item));
    });
  }

  const remaining = fs.readdirSync(DEL_DIR);
  if (remaining.length === 0) {
    fs.rmdirSync(DEL_DIR);
    console.log("Removed empty .del directory.");
  } else {
    console.log("Note: .del directory is not empty, skipping removal.");
  }
}

// ==========================================
// 在这里写死你需要移动的文件或文件夹路径列表
// ==========================================
const targetItems = [
  ".qwen",
  "docs",
  "docs-site",
  "eslint-rules",
  "integration-tests",
  ".dockerignore",
  ".yamllint.yml",
  "CONTRIBUTING.md",
  "AGENTS.md",
  ".prettierrc.json",
  ".prettierignore",
  "Dockerfile",
  "Makefile",
  "SECURITY.md",
];

const mode = process.argv[2];

if (mode === "move") {
  if (targetItems.length === 0) {
    console.log(
      "请先在脚本代码的 targetItems 数组中添加需要移动的文件或文件夹名称。",
    );
    process.exit(1);
  }
  moveToDel(targetItems);
} else if (mode === "restore") {
  restoreFromDel();
} else {
  console.log("Usage: node scripts/del_manager.js <move|restore>");
  process.exit(1);
}
