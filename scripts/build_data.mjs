import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const pyMerge = join(repoRoot, 'pytoncode', 'update_from_docx.py');
const pyOutput = join(repoRoot, 'public', 'new_bots.json');
const publicJson = join(repoRoot, 'public', 'new_bots.json');

function runPython() {
  // Try python3 first, then python (Windows typically uses 'python')
  const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  let lastRes = null;
  for (const exe of candidates) {
    const res = spawnSync(exe, [pyMerge], {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    lastRes = res;
    if (res.status === 0) return res;
  }
  return lastRes;
}

function safeReadJSON(path) {
  if (!existsSync(path)) return null;
  try {
    const txt = readFileSync(path, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

function ensureDir(path) {
  try { mkdirSync(path, { recursive: true }); } catch {}
}

const res = runPython();
if (res && res.status !== 0) {
  console.warn('[data:build] Python merge script exited with non-zero. Continuing if file updated.');
}

const dataText = existsSync(pyOutput) ? readFileSync(pyOutput, 'utf8') : null;
if (!dataText) {
  console.log('[data:build] No changes to public/new_bots.json');
  process.exit(0);
}
let data;
try {
  data = JSON.parse(dataText);
} catch (e) {
  console.error('[data:build] Invalid JSON at public/new_bots.json');
  process.exit(1);
}

writeFileSync(publicJson, JSON.stringify(data, null, 2), 'utf8');
console.log(`[data:build] Merged DOCX updates into ${publicJson}.`);
