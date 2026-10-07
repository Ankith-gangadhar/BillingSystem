import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { StockMovement } from '../../shared/types';

export class StockMovementRepository {
  constructor(private db: Database = getDb()) {}

  create(movement: any): void {
    this.db.prepare(`
      INSERT INTO stock_movements (
        id, product_id, movement_type, qty_change, stock_before, stock_after,
        reason, reference_type, reference_id, user_id, approved_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movement.id,
      movement.product_id,
      movement.movement_type,
      movement.qty_change,
      movement.stock_before,
      movement.stock_after,
      movement.reason || null,
      movement.reference_type || null,
      movement.reference_id || null,
      movement.user_id,
      movement.approved_by || null,
      movement.created_at
    );
  }

  findByProductId(productId: string, limit: number = 100): StockMovement[] {
    return this.db.prepare(`
      SELECT 
        sm.*,
        p.name as product_name,
        u.name as user_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      JOIN users u ON u.id = sm.user_id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC
      LIMIT ?
    `).all(productId, limit) as StockMovement[];
  }
}

export const stockMovementRepo = new StockMovementRepository();
