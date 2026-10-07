import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  startShift,
  getCurrentOpenShift,
  addCashEvent,
  closeShift,
  getTimeRangeActivityReport,
  closeDay,
  enrichShiftWithAggregates,
} from '../services/shiftService';

export const shiftRouter = Router();

// Start Shift
shiftRouter.post('/start', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { openingCash = 0, notes } = req.body;

  try {
    const shift = startShift(db, {
      userId: req.user!.userId,
      openingCash: Number(openingCash),
      notes,
    });
    res.status(201).json({ shift: enrichShiftWithAggregates(db, shift) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Current Open Shift
shiftRouter.get('/current', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  // Cashier gets their own shift; Admin gets overall current open shift or theirs
  const shift = getCurrentOpenShift(db, req.user?.role !== 'admin' ? req.user?.userId : undefined);
  res.json({ shift });
});

// Add Cash Event (Pay In, Pay Out, Expense, Float)
shiftRouter.post('/cash-events', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { shiftId, type, amount, reason } = req.body;

  if (!shiftId || !type || amount === undefined || !reason) {
    res.status(400).json({ error: 'Shift ID, type, amount, and reason are required.' });
    return;
  }

  try {
    const event = addCashEvent(db, {
      shiftId,
      type,
      amount: Number(amount),
      reason,
      userId: req.user!.userId,
    });
    res.status(201).json({ event });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Close Shift
shiftRouter.post('/:id/close', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { countedCash, notes } = req.body;

  if (countedCash === undefined) {
    res.status(400).json({ error: 'Counted cash amount is required to close shift.' });
    return;
  }

  try {
    const closed = closeShift(db, {
      shiftId: req.params.id,
      countedCash: Number(countedCash),
      notes,
      closingUserId: req.user!.userId,
    });
    res.json({ shift: enrichShiftWithAggregates(db, closed) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: List Shifts
shiftRouter.get('/', authMiddleware, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const shifts = db.prepare(`
    SELECT s.*, u.name as user_name, r.name as reviewed_by_name
    FROM shifts s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN users r ON r.id = s.reviewed_by
    ORDER BY s.started_at DESC
  `).all() as any[];

  res.json({ shifts: shifts.map((s) => enrichShiftWithAggregates(db, s)) });
});

// Time Range Activity Report ("Since I was away" & Custom Timespan)
shiftRouter.get('/activity-report', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startTime, endTime, cashierId } = req.query;

  if (!startTime || !endTime) {
    res.status(400).json({ error: 'startTime and endTime are required.' });
    return;
  }

  const report = getTimeRangeActivityReport(db, startTime as string, endTime as string, cashierId as string);
  res.json({ report });
});

// Close Day (End-of-day summary snapshot)
shiftRouter.post('/day-close', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { date, countedCash } = req.body;

  if (!date || countedCash === undefined) {
    res.status(400).json({ error: 'Date and counted cash are required.' });
    return;
  }

  try {
    const dayClosing = closeDay(db, {
      date,
      countedCash: Number(countedCash),
      closedByUserId: req.user!.userId,
    });
    res.status(201).json({ dayClosing });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List Day Closings History
shiftRouter.get('/day-closings', authMiddleware, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const closings = db.prepare(`
    SELECT dc.*, u.name as closed_by_name
    FROM day_closings dc
    JOIN users u ON u.id = dc.closed_by
    ORDER BY dc.date DESC
  `).all();
  res.json({ closings });
});
