"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockController = void 0;
const database_1 = require("../db/database");
const stockService_1 = require("../services/stockService");
class StockController {
    // Admin: Get Product Stock Movement Card / Ledger
    static getStockCard(req, res) {
        const db = (0, database_1.getDb)();
        try {
            const card = (0, stockService_1.getProductStockCard)(db, req.params.productId);
            res.json(card);
        }
        catch (err) {
            res.status(404).json({ error: err.message });
        }
    }
    // Admin: Manual Stock Adjustment
    static adjust(req, res) {
        const db = (0, database_1.getDb)();
        const { productId, adjustmentType, qtyChange, reason } = req.body;
        if (!productId || !adjustmentType || qtyChange === undefined || !reason) {
            res.status(400).json({ error: 'Product ID, adjustment type, quantity change, and reason are required.' });
            return;
        }
        try {
            const movement = (0, stockService_1.adjustStock)(db, {
                productId,
                adjustmentType,
                qtyChange: Number(qtyChange),
                reason,
                userId: req.user.userId,
                approvedBy: req.user.userId,
            });
            res.status(201).json({ movement });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // Admin: Physical Stock Count Reconciliation Tool
    static reconcile(req, res) {
        const db = (0, database_1.getDb)();
        const { counts } = req.body;
        if (!counts || !Array.isArray(counts)) {
            res.status(400).json({ error: 'Valid counts array is required.' });
            return;
        }
        try {
            const result = (0, stockService_1.reconcileStockCount)(db, counts, req.user.userId, req.user.userId);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // Admin: Run Stock Integrity Check
    static getIntegrity(_req, res) {
        const db = (0, database_1.getDb)();
        const result = (0, database_1.verifyStockIntegrity)(db);
        res.json(result);
    }
}
exports.StockController = StockController;
