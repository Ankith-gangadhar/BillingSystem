import { Response } from 'express';
import { getDb } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { processReturn } from '../services/returnService';
import { verifyAdminPin } from '../services/authService';

export class ReturnController {
  // Process Sale Return
  static processReturn(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { originalBillId, reason, refundMethod, items, adminPin } = req.body;

    if (!originalBillId || !reason || !refundMethod || !items || items.length === 0) {
      res.status(400).json({ error: 'Original Bill ID, reason, refund method, and items are required.' });
      return;
    }

    // If cashier, require inline Admin PIN approval
    let approvedBy: string | null = null;
    if (req.user!.role !== 'admin') {
      if (!adminPin) {
        res.status(400).json({ error: 'Admin PIN approval is required to process refunds.' });
        return;
      }
      const verify = verifyAdminPin(db, adminPin, req.user!.userId, `Process Return for bill ID ${originalBillId}`);
      if (!verify.success) {
        res.status(403).json({ error: 'Invalid Admin PIN.' });
        return;
      }
      approvedBy = verify.adminUser!.id;
    } else {
      approvedBy = req.user!.userId;
    }

    try {
      const record = processReturn(db, {
        originalBillId,
        reason,
        refundMethod,
        items,
        userId: req.user!.userId,
        approvedBy,
      });
      res.status(201).json({ returnRecord: record });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // List Returns
  static getAll(_req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const returns = db.prepare(`
      SELECT 
        r.*,
        b.bill_number as original_bill_number,
        u.name as user_name,
        app.name as approved_by_name
      FROM returns r
      JOIN bills b ON b.id = r.original_bill_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN users app ON app.id = r.approved_by
      ORDER BY r.created_at DESC
    `).all() as any[];

    const getItems = db.prepare('SELECT * FROM return_items WHERE return_id = ?');
    for (const r of returns) {
      r.items = getItems.all(r.id);
    }

    res.json({ returns });
  }
}
