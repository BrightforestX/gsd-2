import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default: sibling of React_flow_test — ontologies/gsd-capabilities.linkml.yaml */
function defaultYamlPath() {
  return path.resolve(__dirname, '..', '..', 'gsd-capabilities.linkml.yaml');
}

/**
 * Dev/preview middleware: SSE stream of gsd-capabilities.linkml.yaml contents on change.
 * Client: `new EventSource('/api/gsd-linkml/stream')`
 */
export function gsdLinkmlStreamPlugin(options = {}) {
  const yamlPath = options.yamlPath ?? defaultYamlPath();
  const route = options.route ?? '/api/gsd-linkml/stream';
  const debounceMs = options.debounceMs ?? 120;

  function attach(server) {
    server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== route || req.method !== 'GET') return next();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        let watcher;
        let debounceTimer;
        let closed = false;

        const send = (payload) => {
          if (closed) return;
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        const readAndSend = () => {
          fs.readFile(yamlPath, 'utf8', (err, content) => {
            if (closed) return;
            if (err) {
              send({
                type: 'error',
                message: err.message,
                code: err.code,
                path: yamlPath,
              });
              return;
            }
            fs.stat(yamlPath, (e, st) => {
              if (closed) return;
              send({
                type: 'update',
                content,
                mtimeMs: st?.mtimeMs ?? 0,
                size: st?.size ?? content.length,
                path: yamlPath,
              });
            });
          });
        };

        const schedulePush = () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            readAndSend();
          }, debounceMs);
        };

        readAndSend();

        try {
          watcher = fs.watch(yamlPath, { persistent: false }, () => schedulePush());
        } catch (e) {
          send({ type: 'error', message: `Watch failed: ${e.message}`, path: yamlPath });
        }

        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearTimeout(debounceTimer);
          try {
            watcher?.close();
          } catch {
            /* ignore */
          }
        };

        req.on('close', cleanup);
        res.on('close', cleanup);
      });
  }

  return {
    name: 'gsd-linkml-stream',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
