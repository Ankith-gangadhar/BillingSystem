import { Database } from 'better-sqlite3';
import crypto from 'crypto';
import { CashEvent, DayClosing, Shift } from '../../shared/types';
import { logAudit } from '../db/database';

export function startShift(
  db: Database,
  data: {
    userId: string;
    openingCash: number; // In Paise
    notes?: string | null;
  }
): Shift {
  // Check if user already has an active open shift
  const existing = db.prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'").get(data.userId) as Shift | undefined;
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO shifts (id, user_id, started_at, opening_cash, status, notes)
    VALUES (?, ?, ?, ?, 'open', ?)
  `).run(id, data.userId, now, data.openingCash, data.notes || null);

  logAudit(db, {
    userId: data.userId,
    actingRole: 'cashier',
    action: 'SHIFT_STARTED',
    entityType: 'shifts',
    entityId: id,
    newValue: { openingCash: data.openingCash },
    severity: 'info',
  });

  return db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as Shift;
}

export function getCurrentOpenShift(db: Database, userId?: string): Shift | null {
  let query = "SELECT s.*, u.name as user_name FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.status = 'open'";
  const params: any[] = [];
  if (userId) {
    query += ' AND s.user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY s.started_at DESC LIMIT 1';

  const shift = db.prepare(query).get(...params) as any;
  if (!shift) return null;

  return enrichShiftWithAggregates(db, shift);
}

export function addCashEvent(
  db: Database,
  data: {
    shiftId: string;
    type: 'pay_in' | 'pay_out' | 'expense' | 'float';
    amount: number; // Paise
    reason: string;
    userId: string;
  }
): CashEvent {
  if (!data.reason || data.reason.trim().length === 0) {
    throw new Error('A reason is mandatory for cash events.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cash_events (id, shift_id, type, amount, reason, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.shiftId, data.type, data.amount, data.reason, data.userId, now);

  logAudit(db, {
    userId: data.userId,
    actingRole: 'cashier',
    action: `CASH_EVENT_${data.type.toUpperCase()}`,
    entityType: 'cash_events',
    entityId: id,
    newValue: { type: data.type, amount: data.amount, reason: data.reason },
    reason: data.reason,
    severity: 'notice',
  });

  return {
    id,
    shift_id: data.shiftId,
    type: data.type,
    amount: data.amount,
    reason: data.reason,
    user_id: data.userId,
    created_at: now,
  };
}

export function calculateExpectedCash(db: Database, shiftId: string): number {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId) as Shift | undefined;
  if (!shift) throw new Error('Shift not found');

  // 1. Opening cash
  let expected = shift.opening_cash;

  // 2. Cash sales for completed bills in this shift
  const cashSalesRow = db.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as cash_total
    FROM payments p
    JOIN bills b ON b.id = p.bill_id
    WHERE b.shift_id = ? AND b.status = 'completed' AND p.method = 'cash'
  `).get(shiftId) as { cash_total: number };
  expected += cashSalesRow.cash_total;

  // 3. Cash refunds for returns processed in this shift
  const cashRefundsRow = db.prepare(`
    SELECT COALESCE(SUM(r.refund_amount), 0) as refund_total
    FROM returns r
    JOIN bills b ON b.id = r.original_bill_id
    WHERE b.shift_id = ? AND r.refund_method = 'cash'
  `).get(shiftId) as { refund_total: number };
  expected -= cashRefundsRow.refund_total;

  // 4. Cash events (pay_in vs pay_out / expense)
  const cashEvents = db.prepare('SELECT type, amount FROM cash_events WHERE shift_id = ?').all(shiftId) as any[];
  for (const ce of cashEvents) {
    if (ce.type === 'pay_in' || ce.type === 'float') {
      expected += ce.amount;
    } else if (ce.type === 'pay_out' || ce.type === 'expense') {
      expected -= ce.amount;
    }
  }

  return expected;
}

export function closeShift(
  db: Database,
  data: {
    shiftId: string;
    countedCash: number; // Paise
    notes?: string | null;
    closingUserId: string;
  }
): Shift {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(data.shiftId) as Shift | undefined;
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'closed') throw new Error('Shift is already closed');

  const expectedCash = calculateExpectedCash(db, data.shiftId);
  const difference = data.countedCash - expectedCash;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE shifts
    SET status = 'closed', ended_at = ?, expected_cash = ?, counted_cash = ?, cash_difference = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(now, expectedCash, data.countedCash, difference, data.notes || null, data.shiftId);

  logAudit(db, {
    userId: data.closingUserId,
    actingRole: 'cashier',
    action: 'SHIFT_CLOSED',
    entityType: 'shifts',
    entityId: data.shiftId,
    newValue: {
      expectedCash,
      countedCash: data.countedCash,
      difference,
    },
    severity: Math.abs(difference) > 10000 ? 'warning' : 'info', // Flag difference > ₹100
  });

  return db.prepare('SELECT * FROM shifts WHERE id = ?').get(data.shiftId) as Shift;
}

export function enrichShiftWithAggregates(db: Database, shift: any): Shift {
  const billsSummary = db.prepare(`
    SELECT 
      COUNT(*) as bills_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(discount_total), 0) as discounts_total,
      COALESCE(SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END), 0) as voids_count
    FROM bills 
    WHERE shift_id = ? AND status IN ('completed', 'voided')
  `).get(shift.id) as any;

  const paymentsBreakdown = db.prepare(`
    SELECT 
      p.method,
      COALESCE(SUM(p.amount), 0) as total
    FROM payments p
    JOIN bills b ON b.id = p.bill_id
    WHERE b.shift_id = ? AND b.status = 'completed'
    GROUP BY p.method
  `).all(shift.id) as any[];

  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;
  for (const pb of paymentsBreakdown) {
    if (pb.method === 'cash') cashSales = pb.total;
    if (pb.method === 'upi') upiSales = pb.total;
    if (pb.method === 'card') cardSales = pb.total;
  }

  const customItems = db.prepare(`
    SELECT COUNT(*) as count 
    FROM bill_items bi 
    JOIN bills b ON b.id = bi.bill_id 
    WHERE b.shift_id = ? AND bi.is_custom = 1 AND b.status = 'completed'
  `).get(shift.id) as { count: number };

  const returns = db.prepare(`
    SELECT COALESCE(SUM(r.refund_amount), 0) as total
    FROM returns r
    JOIN bills b ON b.id = r.original_bill_id
    WHERE b.shift_id = ?
  `).get(shift.id) as { total: number };

  const expectedCash = shift.expected_cash ?? calculateExpectedCash(db, shift.id);

  return {
    ...shift,
    expected_cash: expectedCash,
    bills_count: billsSummary.bills_count,
    total_sales: billsSummary.total_sales,
    cash_sales: cashSales,
    upi_sales: upiSales,
    card_sales: cardSales,
    discounts_total: billsSummary.discounts_total,
    voids_count: billsSummary.voids_count,
    returns_total: returns.total,
    custom_items_count: customItems.count,
  };
}

// Time Range Activity Report ("Since I was away" & Custom Window)
export function getTimeRangeActivityReport(
  db: Database,
  startTime: string,
  endTime: string,
  cashierId?: string
) {
  let query = `
    SELECT 
      b.*,
      u.name as cashier_name,
      c.name as customer_name
    FROM bills b
    JOIN users u ON u.id = b.cashier_id
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.created_at >= ? AND b.created_at <= ?
  `;
  const params: any[] = [startTime, endTime];

  if (cashierId) {
    query += ' AND b.cashier_id = ?';
    params.push(cashierId);
  }

  query += ' ORDER BY b.created_at DESC';

  const bills = db.prepare(query).all(...params) as any[];

  let totalSales = 0;
  let totalDiscounts = 0;
  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;
  let voidsCount = 0;

  for (const b of bills) {
    if (b.status === 'completed') {
      totalSales += b.grand_total;
      totalDiscounts += b.discount_total;
    } else if (b.status === 'voided') {
      voidsCount++;
    }
  }

  const paymentsQuery = `
    SELECT p.method, COALESCE(SUM(p.amount), 0) as total
    FROM payments p
    JOIN bills b ON b.id = p.bill_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
    ${cashierId ? 'AND b.cashier_id = ?' : ''}
    GROUP BY p.method
  `;
  const payments = db.prepare(paymentsQuery).all(...params) as any[];
  for (const p of payments) {
    if (p.method === 'cash') cashSales = p.total;
    if (p.method === 'upi') upiSales = p.total;
    if (p.method === 'card') cardSales = p.total;
  }

  const customItemsCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND bi.is_custom = 1 AND b.status = 'completed'
  `).get(startTime, endTime) as { count: number };

  return {
    from_time: startTime,
    to_time: endTime,
    bills_count: bills.filter((b) => b.status === 'completed').length,
    total_sales: totalSales,
    cash_sales: cashSales,
    upi_sales: upiSales,
    card_sales: cardSales,
    discounts_count: bills.filter((b) => b.discount_total > 0).length,
    discounts_total: totalDiscounts,
    custom_items_count: customItemsCount.count,
    voids_count: voidsCount,
    bills,
  };
}

// End of Day Closing Snapshot
export function closeDay(
  db: Database,
  data: {
    date: string; // YYYY-MM-DD
    countedCash: number; // Paise
    closedByUserId: string;
  }
): DayClosing {
  const existing = db.prepare('SELECT * FROM day_closings WHERE date = ?').get(data.date) as DayClosing | undefined;
  if (existing) {
    throw new Error(`Day closing for ${data.date} is already finalized and immutable.`);
  }

  const startOfDay = `${data.date} 00:00:00`;
  const endOfDay = `${data.date} 23:59:59`;

  const summary = getTimeRangeActivityReport(db, startOfDay, endOfDay);
  const shifts = db.prepare('SELECT * FROM shifts WHERE started_at >= ? AND started_at <= ?').all(startOfDay, endOfDay) as any[];

  let expectedCash = 0;
  for (const s of shifts) {
    expectedCash += calculateExpectedCash(db, s.id);
  }

  const difference = data.countedCash - expectedCash;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const snapshot = JSON.stringify({
    summary,
    shifts: shifts.map((s) => enrichShiftWithAggregates(db, s)),
    timestamp: now,
  });

  db.prepare(`
    INSERT INTO day_closings (id, date, totals_snapshot, expected_cash, counted_cash, difference, closed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.date, snapshot, expectedCash, data.countedCash, difference, data.closedByUserId, now);

  logAudit(db, {
    userId: data.closedByUserId,
    actingRole: 'admin',
    action: 'DAY_CLOSED',
    entityType: 'day_closings',
    entityId: id,
    newValue: {
      date: data.date,
      totalSales: summary.total_sales,
      expectedCash,
      countedCash: data.countedCash,
      difference,
    },
    severity: 'notice',
  });

  return db.prepare('SELECT * FROM day_closings WHERE id = ?').get(id) as DayClosing;
}
