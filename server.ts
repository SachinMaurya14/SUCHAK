import express from 'express';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureFastApiProcess() {
  const checkReq = http.get('http://127.0.0.1:8001/health', (_res) => {
    // Already active
  });
  checkReq.on('error', () => {
    console.log('[SUCHAK] Spawning FastAPI backend process on 127.0.0.1:8001...');
    const fastApiProcess = spawn(
      'python3',
      ['-m', 'uvicorn', 'backend.app.main:app', '--port', '8001', '--host', '127.0.0.1'],
      {
        stdio: 'inherit',
        detached: false,
      }
    );
    fastApiProcess.on('error', (err) => {
      console.error('[SUCHAK] Failed to spawn FastAPI:', err);
    });
  });
}

async function startServer() {
  ensureFastApiProcess();
  const app = express();
  const PORT = 3000;

  // Global health endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Proxy /api requests to FastAPI backend with default organization header if absent
  app.use('/api', (req, res) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: 8001,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:8001',
        'x-organization-slug': (req.headers['x-organization-slug'] as string) || 'oil-india-demo',
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.status(503).json({
        status: 'starting',
        message: 'FastAPI backend service initializing. Please retry.',
        detail: err.message,
      });
    });

    req.pipe(proxyReq, { end: true });
  });

  app.use(express.json());

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUCHAK Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
