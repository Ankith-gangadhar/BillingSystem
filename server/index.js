"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerApp = createServerApp;
exports.startServer = startServer;
const express_1 = require("express");
const cors_1 = require("cors");
const http_1 = require("http");
const database_1 = require("./db/database");
const searchService_1 = require("./services/searchService");
const seed_1 = require("./db/seed");
const authRoutes_1 = require("./routes/authRoutes");
const productRoutes_1 = require("./routes/productRoutes");
const billRoutes_1 = require("./routes/billRoutes");
const stockRoutes_1 = require("./routes/stockRoutes");
const shiftRoutes_1 = require("./routes/shiftRoutes");
const returnRoutes_1 = require("./routes/returnRoutes");
const purchaseRoutes_1 = require("./routes/purchaseRoutes");
const reportRoutes_1 = require("./routes/reportRoutes");
const auditRoutes_1 = require("./routes/auditRoutes");
const backupRoutes_1 = require("./routes/backupRoutes");
const importExportRoutes_1 = require("./routes/importExportRoutes");
const settingsRoutes_1 = require("./routes/settingsRoutes");
function createServerApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: '*' }));
    app.use(express_1.default.json({ limit: '20mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
    // API Route Mounting
    app.use('/api/auth', authRoutes_1.authRouter);
    app.use('/api/products', productRoutes_1.productRouter);
    app.use('/api/bills', billRoutes_1.billRouter);
    app.use('/api/stock', stockRoutes_1.stockRouter);
    app.use('/api/shifts', shiftRoutes_1.shiftRouter);
    app.use('/api/returns', returnRoutes_1.returnRouter);
    app.use('/api/purchases', purchaseRoutes_1.purchaseRouter);
    app.use('/api/reports', reportRoutes_1.reportRouter);
    app.use('/api/audit', auditRoutes_1.auditRouter);
    app.use('/api/backups', backupRoutes_1.backupRouter);
    app.use('/api/import-export', importExportRoutes_1.importExportRouter);
    app.use('/api/settings', settingsRoutes_1.settingsRouter);
    // Health Check
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString() });
    });
    return app;
}
function startServer(port = 3001) {
    const app = createServerApp();
    const db = (0, database_1.getDb)();
    // Initialize in-memory search engine
    const countRow = db.prepare('SELECT count(*) as cnt FROM products').get();
    if (countRow.cnt === 0) {
        console.log('[Server] Database is empty. Auto-seeding initial demo data...');
        (0, seed_1.runSeed)(db);
    }
    else {
        searchService_1.searchEngine.initIndex(db);
    }
    const server = http_1.default.createServer(app);
    server.listen(port, '127.0.0.1', () => {
        console.log(`[Server] Mangalore Store POS Server running at http://127.0.0.1:${port}`);
    });
    return server;
}
if (require.main === module) {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    startServer(PORT);
}
