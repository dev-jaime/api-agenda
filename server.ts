import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes';
import { initDB } from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS headers for external clients and Render deployment
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, x-api-key, X-App-Admin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Initialize DB before starting
  console.log('Initializing local JSON database...');
  initDB();

  // Mount API router
  app.use('/api', apiRouter);

  // Determine if we're in production or dev
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist'));

  if (!isProd) {
    console.log('Starting server in DEVELOPMENT mode with Vite Middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    
    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);

    // Serves index.html with HTML transforms
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log('Starting server in PRODUCTION mode...');
    // Serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    
    // SPA fallback
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 API Agenda Server running at http://localhost:${port}`);
    console.log(`👉 Dev URL: ${process.env.APP_URL || `http://localhost:${port}`}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
