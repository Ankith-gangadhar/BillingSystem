import { describe, it, expect } from 'vitest';
import { createSaleTransaction, generateDailyBillNumber, voidBill } from '../server/services/billService';
import { initTestDb } from '../server/db/database';
import crypto from 'crypto';

describe('Sales & Bill Transactions', () => {
  it('should generate sequential, gap-free daily bill numbers', () => {
    const db = initTestDb();
    const billNo1 = generateDailyBillNumber(db, 'MS');
    const billNo2 = generateDailyBillNumber(db, 'MS');
    const billNo3 = generateDailyBillNumber(db, 'MS');

    expect(billNo1).toMatch(/^MS-\d{8}-0001$/);
    expect(billNo2).toMatch(/^MS-\d{8}-0002$/);
    expect(billNo3).toMatch(/^MS-\d{8}-0003$/);

    db.close();
  });

  it('should atomically deduct inventory stock and record sale movements', () => {
    const db = initTestDb();

    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    const shiftId = crypto.randomUUID();
    db.prepare("INSERT INTO shifts (id, user_id, started_at, opening_cash) VALUES (?, ?, 'now', 10000)").run(shiftId, userId);

    const prodId = crypto.randomUUID();
    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Kori Rotti', 6500, 50, ?)").run(prodId, userId);

    const bill = createSaleTransaction(db, {
      shiftId,
      cashierId: userId,
      items: [{ productId: prodId, name: 'Kori Rotti', qty: 3, listPrice: 6500, soldPrice: 6500 }],
      payments: [{ method: 'cash', amount: 19500 }],
    });

    expect(bill.status).toBe('completed');
    expect(bill.grand_total).toBe(19500);

    // Verify stock is now 50 - 3 = 47
    const productAfter = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodId) as any;
    expect(productAfter.current_stock).toBe(47);

    // Verify stock movement was created
    const movements = db.prepare('SELECT * FROM stock_movements WHERE product_id = ?').all(prodId) as any[];
    expect(movements.length).toBe(1);
    expect(movements[0].movement_type).toBe('sale');
    expect(movements[0].qty_change).toBe(-3);
    expect(movements[0].stock_before).toBe(50);
    expect(movements[0].stock_after).toBe(47);

    db.close();
  });

  it('should restore stock when a bill is voided by an admin', () => {
    const db = initTestDb();

    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    const shiftId = crypto.randomUUID();
    db.prepare("INSERT INTO shifts (id, user_id, started_at, opening_cash) VALUES (?, ?, 'now', 10000)").run(shiftId, userId);

    const prodId = crypto.randomUUID();
    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Pure Ghee', 45000, 10, ?)").run(prodId, userId);

    const bill = createSaleTransaction(db, {
      shiftId,
      cashierId: userId,
      items: [{ productId: prodId, name: 'Pure Ghee', qty: 2, listPrice: 45000, soldPrice: 45000 }],
      payments: [{ method: 'upi', amount: 90000 }],
    });

    expect((db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodId) as any).current_stock).toBe(8);

    // Void the bill
    voidBill(db, {
      billId: bill.id,
      adminUserId: userId,
      reason: 'Customer cancelled transaction immediately',
    });

    const voidedBill = db.prepare('SELECT status FROM bills WHERE id = ?').get(bill.id) as any;
    expect(voidedBill.status).toBe('voided');

    // Stock should be restored back to 10
    const restoredProduct = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(prodId) as any;
    expect(restoredProduct.current_stock).toBe(10);

    db.close();
  });
});
