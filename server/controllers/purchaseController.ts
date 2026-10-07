import { Response } from 'express';
import { getDb } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { receivePurchase } from '../services/purchaseService';

export class PurchaseController {
  // Admin: Receive Stock Purchase
  static receive(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { supplierId, invoiceNumber, date, items } = req.body;

    if (!invoiceNumber || !date || !items || items.length === 0) {
      res.status(400).json({ error: 'Invoice number, date, and items are required.' });
      return;
    }

    try {
      const purchase = receivePurchase(db, {
        supplierId,
        invoiceNumber,
        date,
        items,
        userId: req.user!.userId,
      });
      res.status(201).json({ purchase });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // Admin: List Purchases
  static getAll(_req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const purchases = db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name,
        u.name as user_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      JOIN users u ON u.id = p.user_id
      ORDER BY p.date DESC, p.created_at DESC
    `).all() as any[];

    const getItems = db.prepare(`
      SELECT pi.*, prod.name as product_name
      FROM purchase_items pi
      JOIN products prod ON prod.id = pi.product_id
      WHERE pi.purchase_id = ?
    `);

    for (const p of purchases) {
      p.items = getItems.all(p.id);
    }

    res.json({ purchases });
  }
}
