import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { Shift, CashEvent, DayClosing } from '../../shared/types';

export class ShiftRepository {
  constructor(private db: Database = getDb()) {}

  findById(id: string): Shift | undefined {
    return this.db.prepare(`
      SELECT s.*, u.name as user_name, r.name as reviewed_by_name
      FROM shifts s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN users r ON r.id = s.reviewed_by
      WHERE s.id = ?
    `).get(id) as Shift | undefined;
  }

  findOpenShift(userId?: string): any {
    let query = "SELECT s.*, u.name as user_name FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.status = 'open'";
    const params: any[] = [];
    if (userId) {
      query += ' AND s.user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY s.started_at DESC LIMIT 1';
    return this.db.prepare(query).get(...params);
  }

  createShift(shift: { id: string; user_id: string; started_at: string; opening_cash: number; notes: string | null }): void {
    this.db.prepare(`
      INSERT INTO shifts (id, user_id, started_at, opening_cash, status, notes)
      VALUES (?, ?, ?, ?, 'open', ?)
    `).run(shift.id, shift.user_id, shift.started_at, shift.opening_cash, shift.notes);
  }

  closeShift(id: string, endedAt: string, expectedCash: number, countedCash: number, difference: number, notes: string | null): void {
    this.db.prepare(`
      UPDATE shifts
      SET status = 'closed', ended_at = ?, expected_cash = ?, counted_cash = ?, cash_difference = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(endedAt, expectedCash, countedCash, difference, notes, id);
  }

  createCashEvent(event: CashEvent): void {
    this.db.prepare(`
      INSERT INTO cash_events (id, shift_id, type, amount, reason, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(event.id, event.shift_id, event.type, event.amount, event.reason, event.user_id, event.created_at);
  }

  findCashEventsByShiftId(shiftId: string): any[] {
    return this.db.prepare('SELECT type, amount FROM cash_events WHERE shift_id = ?').all(shiftId);
  }

  createDayClosing(closing: DayClosing): void {
    this.db.prepare(`
      INSERT INTO day_closings (id, date, totals_snapshot, expected_cash, counted_cash, difference, closed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      closing.id,
      closing.date,
      closing.totals_snapshot,
      closing.expected_cash,
      closing.counted_cash,
      closing.difference,
      closing.closed_by,
      closing.created_at
    );
  }

  findDayClosingByDate(date: string): DayClosing | undefined {
    return this.db.prepare('SELECT * FROM day_closings WHERE date = ?').get(date) as DayClosing | undefined;
  }
}

export const shiftRepo = new ShiftRepository();
