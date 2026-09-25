/**
 * Builds the client for GitHub Pages into the repository root, which Pages serves.
 *   npm run build:pages                                   -> demo mode (localStorage)
 *   VITE_API_URL=https://api.example.com npm run build:pages -> talks to the real API
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Previous build output (and the original static prototype) living at the root.
for (const entry of ['index.html', 'assets', 'favicon.svg', '404.html', 'style.css', 'script.js']) {
  const target = join(root, entry);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

execSync('npm run build:pages -w client', { cwd: root, stdio: 'inherit', env: process.env });

// Serve files as-is (no Jekyll processing of the assets folder).
writeFileSync(join(root, '.nojekyll'), '');

const mode = process.env.VITE_API_URL ? `api (${process.env.VITE_API_URL})` : 'demo (localStorage)';
console.log(`\nGitHub Pages build written to the repository root. Data mode: ${mode}`);
