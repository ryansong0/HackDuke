import * as esbuild from 'esbuild';
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, 'dist');

// Clean output
if (existsSync(dist)) {
  rmSync(dist, { recursive: true });
}

console.log('Building EcoSwap Chrome Extension...\n');

// 1. Build popup (React + JSX)
console.log('  [1/4] Building popup...');
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/popup/main.tsx')],
  bundle: true,
  outfile: resolve(dist, 'popup/main.js'),
  format: 'esm',
  target: 'chrome120',
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
});

// 2. Build content script (IIFE, injected into pages)
console.log('  [2/4] Building content script...');
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/content/index.ts')],
  bundle: true,
  outfile: resolve(dist, 'content/content.js'),
  format: 'iife',
  target: 'chrome120',
  minify: true,
  sourcemap: false,
});

// 3. Build background service worker (IIFE)
console.log('  [3/4] Building background service worker...');
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/background/service-worker.ts')],
  bundle: true,
  outfile: resolve(dist, 'background/service-worker.js'),
  format: 'iife',
  target: 'chrome120',
  minify: true,
  sourcemap: false,
});

// 4. Build preview page (standalone, works without extension APIs)
console.log('  [4/4] Building preview page...');
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/preview/main.tsx')],
  bundle: true,
  outfile: resolve(dist, 'preview/main.js'),
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  sourcemap: false,
});

// 5. Copy static assets
console.log('\n  Copying static assets...');
cpSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));
cpSync(resolve(__dirname, 'src/popup/index.html'), resolve(dist, 'popup/index.html'));
cpSync(resolve(__dirname, 'src/popup/popup.css'), resolve(dist, 'popup/popup.css'));

if (existsSync(resolve(__dirname, 'src/icons'))) {
  cpSync(resolve(__dirname, 'src/icons'), resolve(dist, 'icons'), { recursive: true });
}

cpSync(resolve(__dirname, 'src/preview/index.html'), resolve(dist, 'preview/index.html'));
cpSync(resolve(__dirname, 'src/preview/preview.css'), resolve(dist, 'preview/preview.css'));

console.log('\n  ✓ Build complete! Output in ./dist/');
console.log('  Load as unpacked extension in chrome://extensions/');
console.log('  Preview without Chrome: open dist/preview/index.html in any browser\n');
