import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const serverAppDir = path.join(repoRoot, '.next', 'server', 'app');

if (!fs.existsSync(serverAppDir)) {
  console.error(`[Metadata Build Guard] Error: .next/server/app directory not found at ${serverAppDir}. Run 'npm run build' first.`);
  process.exit(1);
}

const forbiddenPatterns = [
  /https?:\/\/localhost(:\d+)?/gi,
  /https?:\/\/127\.0\.0\.1(:\d+)?/gi
];

let violations = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const pattern of forbiddenPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      violations.push({
        file: filePath,
        matches: [...new Set(matches)]
      });
    }
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.html') || entry.name.endsWith('.meta')) {
        checkFile(fullPath);
      }
    }
  }
}

console.log('[Metadata Build Guard] Scanning generated production files for localhost / 127.0.0.1 leaks...');
scanDir(serverAppDir);

if (violations.length > 0) {
  console.error('\n[Metadata Build Guard] ❌ FAILURE: Localhost leaked into production build artifacts:');
  for (const v of violations) {
    console.error(`  - ${path.relative(repoRoot, v.file)} contains: ${v.matches.join(', ')}`);
  }
  process.exit(1);
} else {
  console.log('[Metadata Build Guard] ✅ SUCCESS: Zero localhost / 127.0.0.1 references found in production output metadata and HTML.');
  process.exit(0);
}
