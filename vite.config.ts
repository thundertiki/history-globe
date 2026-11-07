import { defineConfig, Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Writes dist/sw.js: an offline cache for the installed web app (GitHub Pages). The cache name hashes the
 * built files and everything in public/, so any code or data change replaces the old cache.
 */
function serviceWorker(): Plugin {
  return {
    name: 'hg-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const hash = createHash('sha256');
      const walk = (d: string): string[] =>
        readdirSync(d).flatMap((f) => {
          const p = join(d, f);
          return statSync(p).isDirectory() ? walk(p) : [p];
        });
      for (const p of walk('public').sort()) hash.update(relative('public', p)).update(readFileSync(p));
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      for (const f of built.sort()) hash.update(f);
      const shell = ['./', ...built, 'manifest.webmanifest', 'icons/icon-192.png', 'data/borders/index.json', 'data/entities.json'];
      const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
      const src = readFileSync('src/sw.js', 'utf8')
        .replace('__CACHE__', `hg-${version}-${hash.digest('hex').slice(0, 10)}`)
        .replace('__SHELL__', JSON.stringify(shell));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

// Relative base so the built site works from any path (GitHub Pages, the Claude artifact).
// `vite build --mode artifact` writes fixed file names to dist-artifact/ for pipeline/artifact.mjs.
export default defineConfig(({ mode }) =>
  mode === 'artifact'
    ? {
        base: './',
        build: {
          outDir: 'dist-artifact',
          emptyOutDir: true,
          chunkSizeWarningLimit: 2000,
          rollupOptions: { output: { entryFileNames: 'app.js', assetFileNames: 'app[extname]', inlineDynamicImports: true } },
        },
      }
    : { base: './', plugins: [serviceWorker()], build: { chunkSizeWarningLimit: 2000 } }
);
