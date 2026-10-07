import { Router, Response } from 'express';
import { getDb, verifyStockIntegrity } from '../db/database';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { adjustStock, getProductStockCard, reconcileStockCount } from '../services/stockService';

export const stockRouter = Router();

// Admin: Get Product Stock Movement Card / Ledger
stockRouter.get('/card/:productId', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  try {
    const card = getProductStockCard(db, req.params.productId);
    res.json(card);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Admin: Manual Stock Adjustment
stockRouter.post('/adjust', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
});

// Admin: Physical Stock Count Reconciliation Tool
stockRouter.post('/reconcile', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { counts } = req.body; // Array of { productId, countedQty, reason }

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
});

// Admin: Run Stock Integrity Check (products.current_stock vs SUM(stock_movements))
stockRouter.get('/integrity', authMiddleware, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const result = verifyStockIntegrity(db);
  res.json(result);
});
