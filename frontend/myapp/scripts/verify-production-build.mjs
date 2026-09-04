/**
 * Verifies a production Vite build bakes VITE_API_BASE_URL into the bundle.
 *
 *   pnpm run verify:build
 *   VITE_API_BASE_URL=https://api.staging.example.com pnpm run verify:build
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_URL = (process.env.VITE_API_BASE_URL ?? 'https://api.staging.zentro.example')
  .replace(/\/$/, '');

function runBuild() {
  const result = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'vite', 'build'],
    {
      env: { ...process.env, VITE_API_BASE_URL: API_URL },
      stdio: 'inherit',
      shell: true,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertApiUrlInBundle() {
  const distDir = join(process.cwd(), 'dist');
  const assetsDir = join(distDir, 'assets');

  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing after build');
  }

  if (!existsSync(assetsDir)) {
    throw new Error('dist/assets missing after build');
  }

  const jsFiles = readdirSync(assetsDir).filter(name => name.endsWith('.js'));

  if (jsFiles.length === 0) {
    throw new Error('no JS assets in dist/assets');
  }

  const found = jsFiles.some((name) => {
    const content = readFileSync(join(assetsDir, name), 'utf8');

    return content.includes(API_URL);
  });

  if (!found) {
    throw new Error(`VITE_API_BASE_URL "${API_URL}" not found in dist/assets/*.js`);
  }
}

console.log(`Production build check — VITE_API_BASE_URL=${API_URL}\n`);
runBuild();
assertApiUrlInBundle();
console.log('\n✓ Production build succeeded and API URL is embedded in the bundle.\n');
