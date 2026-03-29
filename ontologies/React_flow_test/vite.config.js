import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { gsdLinkmlStreamPlugin } from './plugins/gsdLinkmlStreamPlugin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Schema variants ───────────────────────────────────────────────────────────
// Set VITE_SCHEMA to select which schema config to build.
// Valid values: 'chemdcat' (default) | 'coremeta4cat' | 'dcat-ap-plus'
//
//   Dev:    npm run dev                  → chemdcat  (localhost:5173/)
//           VITE_SCHEMA=coremeta4cat npm run dev
//   Build:  npm run build                → chemdcat  (dist/chemdcat/)
//           npm run build:all            → all three variants

const SCHEMA_CONFIGS = {
  'chemdcat': {
    configFile: 'chemdcat.config.js',
    base:       '/React_flow_test/chemdcat/',
    outDir:     'dist/chemdcat',
  },
  'coremeta4cat': {
    configFile: 'coremeta4cat.config.js',
    base:       '/React_flow_test/coremeta4cat/',
    outDir:     'dist/coremeta4cat',
  },
  'dcat-ap-plus': {
    configFile: 'dcat-ap-plus.config.js',
    base:       '/React_flow_test/dcat-ap-plus/',
    outDir:     'dist/dcat-ap-plus',
  },
};

export default defineConfig(({ command, mode }) => {
  // loadEnv reads .env files AND process.env (including CI variables)
  const env   = loadEnv(mode, process.cwd(), '');
  const key   = env.VITE_SCHEMA ?? 'chemdcat';
  const sc    = SCHEMA_CONFIGS[key] ?? SCHEMA_CONFIGS['chemdcat'];

  const mastraTarget = env.MASTRA_SERVER_URL || 'http://127.0.0.1:4111';

  return {
    plugins: [react(), gsdLinkmlStreamPlugin()],

    server: {
      proxy: {
        // Browser calls /api/mastra/* → Mastra dev server (strip prefix). Keys stay on Mastra, not in Vite.
        '/api/mastra': {
          target: mastraTarget,
          changeOrigin: true,
          // `chatRoute({ path: '/chat/:agentId' })` is mounted at the server root, not under /api.
          rewrite: (p) => p.replace(/^\/api\/mastra/, ''),
        },
      },
    },

    // In dev, serve from root; in production use the schema-specific sub-path.
    base: command === 'serve' ? '/' : sc.base,

    // `~config` resolves to the active schema's config file at build time.
    // This ensures only one schema's assets are bundled per build.
    resolve: {
      alias: {
        '~config': path.resolve(__dirname, 'src', 'configs', sc.configFile),
      },
    },

    publicDir: false, // docs files are copied by scripts/copy-docs.mjs
    build: {
      outDir:     sc.outDir,
      emptyOutDir: true,
    },
  };
});
