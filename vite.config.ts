import { defineConfig } from 'vite';

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
    : { base: './', build: { chunkSizeWarningLimit: 2000 } }
);
