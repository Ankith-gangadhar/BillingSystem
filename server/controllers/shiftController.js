"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftController = void 0;
const database_1 = require("../db/database");
const shiftService_1 = require("../services/shiftService");
class ShiftController {
    // Start Shift
    static start(req, res) {
        const db = (0, database_1.getDb)();
        const { openingCash = 0, notes } = req.body;
        try {
            const shift = (0, shiftService_1.startShift)(db, {
                userId: req.user.userId,
                openingCash: Number(openingCash),
                notes,
            });
            res.status(201).json({ shift: (0, shiftService_1.enrichShiftWithAggregates)(db, shift) });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // Get Current Open Shift
    static getCurrent(req, res) {
        const db = (0, database_1.getDb)();
        const shift = (0, shiftService_1.getCurrentOpenShift)(db, req.user?.role !== 'admin' ? req.user?.userId : undefined);
        res.json({ shift });
    }
    // Add Cash Event (Pay In, Pay Out, Expense, Float)
    static addCashEvent(req, res) {
        const db = (0, database_1.getDb)();
        const { shiftId, type, amount, reason } = req.body;
        if (!shiftId || !type || amount === undefined || !reason) {
            res.status(400).json({ error: 'Shift ID, type, amount, and reason are required.' });
            return;
        }
        try {
            const event = (0, shiftService_1.addCashEvent)(db, {
                shiftId,
                type,
                amount: Number(amount),
                reason,
                userId: req.user.userId,
            });
            res.status(201).json({ event });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // Close Shift
    static close(req, res) {
        const db = (0, database_1.getDb)();
        const { countedCash, notes } = req.body;
        if (countedCash === undefined) {
            res.status(400).json({ error: 'Counted cash amount is required to close shift.' });
            return;
        }
        try {
            const closed = (0, shiftService_1.closeShift)(db, {
                shiftId: req.params.id,
                countedCash: Number(countedCash),
                notes,
                closingUserId: req.user.userId,
            });
            res.json({ shift: (0, shiftService_1.enrichShiftWithAggregates)(db, closed) });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // Admin: List Shifts
    static getAll(_req, res) {
        const db = (0, database_1.getDb)();
        const shifts = db.prepare(`
      SELECT s.*, u.name as user_name, r.name as reviewed_by_name
      FROM shifts s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN users r ON r.id = s.reviewed_by
      ORDER BY s.started_at DESC
    `).all();
        res.json({ shifts: shifts.map((s) => (0, shiftService_1.enrichShiftWithAggregates)(db, s)) });
    }
    // Time Range Activity Report ("Since I was away" & Custom Timespan)
    static getActivityReport(req, res) {
        const db = (0, database_1.getDb)();
        const { startTime, endTime, cashierId } = req.query;
        if (!startTime || !endTime) {
            res.status(400).json({ error: 'startTime and endTime are required.' });
            return;
        }
        const report = (0, shiftService_1.getTimeRangeActivityReport)(db, startTime, endTime, cashierId);
        res.json({ report });
    }
    // Close Day (End-of-day summary snapshot)
    static closeDay(req, res) {
        const db = (0, database_1.getDb)();
        const { date, countedCash } = req.body;
        if (!date || countedCash === undefined) {
            res.status(400).json({ error: 'Date and counted cash are required.' });
            return;
        }
        try {
            const dayClosing = (0, shiftService_1.closeDay)(db, {
                date,
                countedCash: Number(countedCash),
                closedByUserId: req.user.userId,
            });
            res.status(201).json({ dayClosing });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    // List Day Closings History
    static getDayClosings(_req, res) {
        const db = (0, database_1.getDb)();
        const closings = db.prepare(`
      SELECT dc.*, u.name as closed_by_name
      FROM day_closings dc
      JOIN users u ON u.id = dc.closed_by
      ORDER BY dc.date DESC
    `).all();
        res.json({ closings });
    }
}
exports.ShiftController = ShiftController;
