import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { PurchaseRecord, PurchaseItem } from '../../shared/types';

export class PurchaseRepository {
  constructor(private db: Database = getDb()) {}

  createPurchase(purchase: PurchaseRecord): void {
    this.db.prepare(`
      INSERT INTO purchases (id, supplier_id, invoice_number, date, total_amount, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      purchase.id,
      purchase.supplier_id || null,
      purchase.invoice_number,
      purchase.date,
      purchase.total_amount,
      purchase.user_id,
      purchase.created_at
    );
  }

  createPurchaseItem(item: PurchaseItem): void {
    this.db.prepare(`
      INSERT INTO purchase_items (id, purchase_id, product_id, qty, cost_price, line_total, update_product_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.purchase_id,
      item.product_id,
      item.qty,
      item.cost_price,
      item.line_total,
      item.update_product_cost
    );
  }

  findAll(): PurchaseRecord[] {
    const purchases = this.db.prepare(`
      SELECT 
        p.*,
        s.name as supplier_name,
        u.name as user_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      JOIN users u ON u.id = p.user_id
      ORDER BY p.date DESC, p.created_at DESC
    `).all() as PurchaseRecord[];

    const getItems = this.db.prepare(`
      SELECT pi.*, prod.name as product_name
      FROM purchase_items pi
      JOIN products prod ON prod.id = pi.product_id
      WHERE pi.purchase_id = ?
    `);

    for (const p of purchases) {
      p.items = getItems.all(p.id) as PurchaseItem[];
    }
    return purchases;
  }
}

export const purchaseRepo = new PurchaseRepository();
