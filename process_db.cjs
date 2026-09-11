const fs = require('fs');
let content = fs.readFileSync('src/server/db.ts', 'utf-8');

// Remove inMemoryStore definition block completely
content = content.replace(/\/\/ In-Memory Storage Cache.*?\nconst inMemoryStore = \{[\s\S]*?^\};\n?/m, '');

// Clean up all references to inMemoryStore.
// 1. Remove lines doing inMemoryStore.*.set or .delete or .clear
content = content.replace(/^[ \t]*inMemoryStore\.[a-zA-Z0-9_]+\.(set|delete|clear)\(.*\);?\r?\n/gm, '');

// 2. Replace lines doing `inMemoryStore.* = ...` (like for siteConfig)
content = content.replace(/^[ \t]*inMemoryStore\.siteConfig.*?\r?\n/gm, '');

// 3. For any return statement using inMemoryStore (fallback), replace it with an empty structure or throw
content = content.replace(/return inMemoryStore\.([a-zA-Z0-9_]+)\.(get\(.*?\)|values\(\).*?)( \|\| null)?;?/g, (match, mapName) => {
  return `throw new Error("Cloud SQL database is required but not connected or query failed.");`;
});
content = content.replace(/return Array\.from\(inMemoryStore\.[a-zA-Z0-9_]+\.values\(\)\).*?;/g, 'throw new Error("Cloud SQL database is required but not connected or query failed.");');
content = content.replace(/return inMemoryStore\.siteConfig;/g, 'throw new Error("Cloud SQL database is required but not connected or query failed.");');
content = content.replace(/return inMemoryStore.*?;/g, 'throw new Error("Cloud SQL database is required but not connected or query failed.");');

// 4. For assignments from inMemoryStore, e.g. let list = Array.from(...)
content = content.replace(/let\s+list\s*=\s*Array\.from\(inMemoryStore.*?;/g, 'throw new Error("Database not connected");');
content = content.replace(/list\s*=\s*Array\.from\(inMemoryStore.*?;/g, 'throw new Error("Database not connected");');
content = content.replace(/const\s+[a-zA-Z0-9_]+\s*=\s*Array\.from\(inMemoryStore.*?;/g, 'throw new Error("Database not connected");');
content = content.replace(/const\s+[a-zA-Z0-9_]+\s*=\s*inMemoryStore.*?;/g, 'throw new Error("Database not connected");');

// 5. Replace any remaining inMemoryStore usages
content = content.replace(/for\s*\(const\s*.*?of\s*inMemoryStore.*?\)\s*\{/g, 'if (false) {');
content = content.replace(/inMemoryStore\.[a-zA-Z0-9_]+\.size/g, '0');
content = content.replace(/inMemoryStore/g, '/* inMemoryStore removed */');

fs.writeFileSync('src/server/db.ts', content);
