import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { ReturnRecord, ReturnItem } from '../../shared/types';

export class ReturnRepository {
  constructor(private db: Database = getDb()) {}

  createReturn(ret: ReturnRecord): void {
    this.db.prepare(`
      INSERT INTO returns (id, original_bill_id, return_number, reason, refund_method, refund_amount, user_id, approved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ret.id,
      ret.original_bill_id,
      ret.return_number,
      ret.reason,
      ret.refund_method,
      ret.refund_amount,
      ret.user_id,
      ret.approved_by || null,
      ret.created_at
    );
  }

  createReturnItem(item: ReturnItem): void {
    this.db.prepare(`
      INSERT INTO return_items (id, return_id, product_id, item_name, qty, unit_price, total_amount, restock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.return_id,
      item.product_id || null,
      item.item_name,
      item.qty,
      item.unit_price,
      item.total_amount,
      item.restock
    );
  }

  findAll(): ReturnRecord[] {
    const returns = this.db.prepare(`
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
    `).all() as ReturnRecord[];

    const getItems = this.db.prepare('SELECT * FROM return_items WHERE return_id = ?');
    for (const r of returns) {
      r.items = getItems.all(r.id) as ReturnItem[];
    }
    return returns;
  }
}

export const returnRepo = new ReturnRepository();
