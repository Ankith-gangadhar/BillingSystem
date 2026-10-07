import { describe, it, expect } from 'vitest';
import { initTestDb } from '../server/db/database';
import { startShift, addCashEvent, calculateExpectedCash, closeShift } from '../server/services/shiftService';
import { createSaleTransaction } from '../server/services/billService';
import crypto from 'crypto';

describe('Shifts & Cash Drawer Accountability', () => {
  it('should accurately calculate expected cash = opening + cash sales - cash payouts', () => {
    const db = initTestDb();

    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Worker', 'cashier', 'hash')").run(userId);

    // 1. Start shift with ₹1,000 opening cash (100,000 paise)
    const shift = startShift(db, {
      userId,
      openingCash: 100000,
    });

    // 2. Make a Cash Sale of ₹500 (50,000 paise)
    const prodId = crypto.randomUUID();
    db.prepare("INSERT INTO products (id, name, selling_price, current_stock, created_by) VALUES (?, 'Item', 50000, 10, ?)").run(prodId, userId);

    createSaleTransaction(db, {
      shiftId: shift.id,
      cashierId: userId,
      items: [{ productId: prodId, name: 'Item', qty: 1, listPrice: 50000, soldPrice: 50000 }],
      payments: [{ method: 'cash', amount: 50000 }],
    });

    // 3. Make a UPI Sale of ₹800 (80,000 paise) - Should NOT affect cash drawer
    createSaleTransaction(db, {
      shiftId: shift.id,
      cashierId: userId,
      items: [{ productId: prodId, name: 'Item', qty: 1, listPrice: 50000, soldPrice: 50000 }],
      payments: [{ method: 'upi', amount: 50000 }],
    });

    // 4. Log a Cash Expense of ₹60 for milk (6,000 paise)
    addCashEvent(db, {
      shiftId: shift.id,
      type: 'expense',
      amount: 6000,
      reason: 'Bought milk for tea',
      userId,
    });

    // Expected Cash = 100,000 + 50,000 - 6,000 = 144,000 paise (₹1,440.00)
    const expected = calculateExpectedCash(db, shift.id);
    expect(expected).toBe(144000);

    // 5. Close Shift with counted cash ₹1,430 (143,000 paise) -> Shortage of ₹10 (-1,000 paise)
    const closed = closeShift(db, {
      shiftId: shift.id,
      countedCash: 143000,
      closingUserId: userId,
    });

    expect(closed.status).toBe('closed');
    expect(closed.expected_cash).toBe(144000);
    expect(closed.counted_cash).toBe(143000);
    expect(closed.cash_difference).toBe(-1000);

    db.close();
  });
});
