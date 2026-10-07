import { describe, it, expect } from 'vitest';
import { initTestDb, logAudit, verifyAuditIntegrity } from '../server/db/database';
import crypto from 'crypto';

describe('Audit Ledger & Hash Chaining Security', () => {
  it('should maintain a valid SHA-256 hash chain across audit entries', () => {
    const db = initTestDb();
    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    logAudit(db, {
      userId,
      actingRole: 'admin',
      action: 'LOGIN_SUCCESS',
      entityType: 'users',
      entityId: userId,
    });

    logAudit(db, {
      userId,
      actingRole: 'admin',
      action: 'PRODUCT_CREATED',
      entityType: 'products',
      entityId: 'p-1',
      newValue: { name: 'Kori Rotti', price: 6500 },
    });

    logAudit(db, {
      userId,
      actingRole: 'admin',
      action: 'STOCK_ADJUSTMENT',
      entityType: 'stock',
      reason: 'Damaged item',
      severity: 'notice',
    });

    const verify = verifyAuditIntegrity(db);
    expect(verify.isValid).toBe(true);
    expect(verify.checkedCount).toBe(3);

    db.close();
  });

  it('should prevent UPDATE and DELETE on stock_movements via SQLite triggers', () => {
    const db = initTestDb();
    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    const prodId = crypto.randomUUID();
    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Test Item', 1000, 10, ?)").run(prodId, userId);

    const movId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO stock_movements (id, product_id, movement_type, qty_change, stock_before, stock_after, user_id)
      VALUES (?, ?, 'opening', 10, 0, 10, ?)
    `).run(movId, prodId, userId);

    // Attempting to UPDATE stock_movements should throw error from SQLite trigger
    expect(() => {
      db.prepare('UPDATE stock_movements SET qty_change = 99 WHERE id = ?').run(movId);
    }).toThrow(/immutable/i);

    // Attempting to DELETE stock_movements should throw error from SQLite trigger
    expect(() => {
      db.prepare('DELETE FROM stock_movements WHERE id = ?').run(movId);
    }).toThrow(/immutable/i);

    db.close();
  });
});
