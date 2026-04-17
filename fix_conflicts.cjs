const fs = require('fs');
const cp = require('child_process');

const conflicts = cp.execSync('git diff --name-only --diff-filter=U').toString().trim().split('\n').filter(Boolean);

for (const file of conflicts) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace qwen packages
  content = content.replace(/@qwen-code\/qwen-code-core/g, '@tram-ai/tram-core');
  content = content.replace(/@qwen-code\/cli/g, '@tram-ai/cli');
  content = content.replace(/@qwen-code\/([a-zA-Z0-9-]+)/g, '@tram-ai/$1');
  
  const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> [^\n]+\r?\n/g;
  
  content = content.replace(conflictRegex, (match, current, incoming) => {
    const isComment = (text) => {
      const lines = text.trim().split('\n');
      return lines.every(line => {
        const trimmed = line.trim();
        return trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
      });
    };
    
    if (isComment(current) && isComment(incoming)) {
      return current + incoming; // keep both if entirely comments
    }
    
    return incoming; // otherwise keep incoming
  });
  
  fs.writeFileSync(file, content);
}
console.log("Done");