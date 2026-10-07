import express from 'express';
import cors from 'cors';
import http from 'http';
import { getDb } from './db/database';
import { searchEngine } from './services/searchService';
import { runSeed } from './db/seed';

import { authRouter } from './routes/authRoutes';
import { productRouter } from './routes/productRoutes';
import { billRouter } from './routes/billRoutes';
import { stockRouter } from './routes/stockRoutes';
import { shiftRouter } from './routes/shiftRoutes';
import { returnRouter } from './routes/returnRoutes';
import { purchaseRouter } from './routes/purchaseRoutes';
import { reportRouter } from './routes/reportRoutes';
import { auditRouter } from './routes/auditRoutes';
import { backupRouter } from './routes/backupRoutes';
import { importExportRouter } from './routes/importExportRoutes';
import { settingsRouter } from './routes/settingsRoutes';

export function createServerApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Route Mounting
  app.use('/api/auth', authRouter);
  app.use('/api/products', productRouter);
  app.use('/api/bills', billRouter);
  app.use('/api/stock', stockRouter);
  app.use('/api/shifts', shiftRouter);
  app.use('/api/returns', returnRouter);
  app.use('/api/purchases', purchaseRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/backups', backupRouter);
  app.use('/api/import-export', importExportRouter);
  app.use('/api/settings', settingsRouter);

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return app;
}

export function startServer(port: number = 3001) {
  const app = createServerApp();
  const db = getDb();

  // Initialize in-memory search engine
  const countRow = db.prepare('SELECT count(*) as cnt FROM products').get() as { cnt: number };
  if (countRow.cnt === 0) {
    console.log('[Server] Database is empty. Auto-seeding initial demo data...');
    runSeed(db);
  } else {
    searchEngine.initIndex(db);
  }

  const server = http.createServer(app);

  server.listen(port, '127.0.0.1', () => {
    console.log(`[Server] Mangalore Store POS Server running at http://127.0.0.1:${port}`);
  });

  return server;
}

if (require.main === module) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  startServer(PORT);
}
