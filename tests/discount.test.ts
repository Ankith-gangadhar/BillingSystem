import { describe, it, expect } from 'vitest';
import { createSaleTransaction } from '../server/services/billService';
import { initTestDb } from '../server/db/database';
import crypto from 'crypto';

describe('Discount & Price Override Distribution', () => {
  it('should proportionally distribute a bill-level discount across items without losing paise', () => {
    const db = initTestDb();

    // Create user and shift
    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    const shiftId = crypto.randomUUID();
    db.prepare("INSERT INTO shifts (id, user_id, started_at, opening_cash) VALUES (?, ?, 'now', 10000)").run(shiftId, userId);

    // Create 2 products: Item A (₹50) and Item B (₹35) -> Subtotal = ₹85
    const prodA = crypto.randomUUID();
    const prodB = crypto.randomUUID();

    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Item A', 5000, 20, ?)").run(prodA, userId);
    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Item B', 3500, 20, ?)").run(prodB, userId);

    // Negotiated Final Price: Total was ₹85.00, customer pays ₹80.00 -> Bill Discount = ₹5.00 (500 paise)
    const bill = createSaleTransaction(db, {
      shiftId,
      cashierId: userId,
      items: [
        { productId: prodA, name: 'Item A', qty: 1, listPrice: 5000, soldPrice: 5000 },
        { productId: prodB, name: 'Item B', qty: 1, listPrice: 3500, soldPrice: 3500 },
      ],
      payments: [{ method: 'cash', amount: 8000, tenderedAmount: 8000 }],
      billDiscountTotal: 500, // ₹5 discount
    });

    expect(bill.subtotal).toBe(8500);
    expect(bill.discount_total).toBe(500);
    expect(bill.grand_total).toBe(8000);

    // Items retain their original list rates
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(bill.id) as any[];
    expect(items[0].list_price_snapshot).toBe(5000);
    expect(items[0].sold_price).toBe(5000);
    expect(items[1].list_price_snapshot).toBe(3500);
    expect(items[1].sold_price).toBe(3500);

    db.close();
  });
});
