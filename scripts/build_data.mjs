import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const pyScript = join(repoRoot, 'pytoncode', 'build_packages_json.py');
const pyOutput = join(repoRoot, 'pytoncode', 'output.json');
const publicJson = join(repoRoot, 'public', 'new_bots.json');

function runPython() {
  // Try python3 first, then python (Windows typically uses 'python')
  const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  let lastRes = null;
  for (const exe of candidates) {
    const res = spawnSync(exe, [pyScript], {
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
  // Continue only if output.json exists and is valid
  // This handles consoles that choke on Unicode prints while file is written.
}

const data = safeReadJSON(pyOutput);
if (!data || !Array.isArray(data.packages) || data.packages.length === 0) {
  console.log('[data:build] Skipped updating public/new_bots.json: no packages found.');
  process.exit(0);
}

ensureDir(join(repoRoot, 'public'));
writeFileSync(publicJson, JSON.stringify(data, null, 2), 'utf8');
console.log(`[data:build] Updated ${publicJson} with ${data.packages.length} package(s).`);

