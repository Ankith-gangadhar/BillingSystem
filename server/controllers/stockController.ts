import { Response } from 'express';
import { getDb, verifyStockIntegrity } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { adjustStock, getProductStockCard, reconcileStockCount } from '../services/stockService';

export class StockController {
  // Admin: Get Product Stock Movement Card / Ledger
  static getStockCard(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    try {
      const card = getProductStockCard(db, req.params.productId as string);
      res.json(card);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  // Admin: Manual Stock Adjustment
  static adjust(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { productId, adjustmentType, qtyChange, reason } = req.body;

    if (!productId || !adjustmentType || qtyChange === undefined || !reason) {
      res.status(400).json({ error: 'Product ID, adjustment type, quantity change, and reason are required.' });
      return;
    }

    try {
      const movement = adjustStock(db, {
        productId,
        adjustmentType,
        qtyChange: Number(qtyChange),
        reason,
        userId: req.user!.userId,
        approvedBy: req.user!.userId,
      });
      res.status(201).json({ movement });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // Admin: Physical Stock Count Reconciliation Tool
  static reconcile(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { counts } = req.body;

    if (!counts || !Array.isArray(counts)) {
      res.status(400).json({ error: 'Valid counts array is required.' });
      return;
    }

    try {
      const result = reconcileStockCount(db, counts, req.user!.userId, req.user!.userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // Admin: Run Stock Integrity Check
  static getIntegrity(_req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const result = verifyStockIntegrity(db);
    res.json(result);
  }
}
