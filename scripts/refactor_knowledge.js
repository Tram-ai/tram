import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');

// 辅助函数：根据文件名生成标准化名称和标题
function standardizeFilename(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.md';
}

function processMarkdownFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    // 如果文件是特定配置或已经拆分过的文件，跳过处理
    if (filename === 'SKILL.md' || filename.startsWith('WEB-SEARCH-MIGRATION')) {
        return;
    }

    // 尝试分离可能存在的 YAML frontmatter
    let frontmatter = '';
    let body = content;
    const yamlMatch = content.match(/^(---\n[\s\S]*?\n---\n)/);
    if (yamlMatch) {
        frontmatter = yamlMatch[1];
        body = content.substring(frontmatter.length);
    }

    // 按一级标题 (# Title) 切分内容（识别是否有多个教程）
    // 并且只匹配真正的 Markdown 标题，不匹配代码块中的注释
    const sections = body.split(/(?=^#\s+)/m).filter(s => s.trim().length > 0);

    if (sections.length > 1) {
        console.log(`[拆分文件] ${filename} 包含 ${sections.length} 个独立部分，准备拆分...`);
        
        sections.forEach((section, index) => {
            // 提取第一行作为新文件的标题
            const lines = section.trim().split('\n');
            const titleLine = lines[0];
            let title = titleLine.replace(/^#\s+/, '').trim();
            
            if (!title) {
                title = `part-${index + 1}`;
            }

            const newFilename = standardizeFilename(title);
            const newFilePath = path.join(KNOWLEDGE_DIR, newFilename);

            // 重新组合新内容：保留原有的 YAML frontmatter，或者生成新的
            let newFrontmatter = frontmatter;
            if (newFrontmatter) {
                // 如果需要，这里可以根据新 title 修改 Yaml name 属性
                newFrontmatter = newFrontmatter.replace(/name:\s*.+/, `name: ${newFilename.replace('.md', '')}`);
            }
            
            // 统一标准化 Markdown 格式 (如确保标题与正文之间有空行等)
            const standardizedSection = section.replace(/(^#.*$)\n([^\n])/gm, '$1\n\n$2');
            
            const newContent = (newFrontmatter ? newFrontmatter + '\n' : '') + standardizedSection;

            fs.writeFileSync(newFilePath, newContent, 'utf-8');
            console.log(`  -> 生成新文件: ${newFilename}`);
        });

        // 拆分完成后，可以选择备份或删除原文件
        // fs.renameSync(filePath, filePath + '.bak');
        console.log(`您可以删除或备份原文件: ${filename}\n`);
    } else {
        // 单个文件的情况下，进行统一化的格式调整
        let updatedBody = body.replace(/(^#.*$)\n([^\n])/gm, '$1\n\n$2');
        if (body !== updatedBody) {
             console.log(`[格式化] 统一化文件: ${filename}`);
             fs.writeFileSync(filePath, frontmatter + updatedBody, 'utf-8');
        }
    }
}

function main() {
    console.log(`开始处理 ${KNOWLEDGE_DIR} 目录下的 Markdown 文件...`);
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    files.forEach(file => {
        if (file.endsWith('.md')) {
            const filePath = path.join(KNOWLEDGE_DIR, file);
            try {
                processMarkdownFile(filePath);
            } catch (err) {
                console.error(`处理 ${file} 时出错:`, err.message);
            }
        }
    });
    console.log('处理完成。');
}

main();
