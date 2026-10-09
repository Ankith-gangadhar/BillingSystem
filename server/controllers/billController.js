"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillController = void 0;
const database_1 = require("../db/database");
const billRepository_1 = require("../repositories/billRepository");
const billService_1 = require("../services/billService");
const shiftRepository_1 = require("../repositories/shiftRepository");
class BillController {
    static async createSale(req, res) {
        const db = (0, database_1.getDb)();
        try {
            let shiftId = req.body.shiftId;
            if (!shiftId) {
                const openShift = shiftRepository_1.shiftRepo.findOpenShift(req.user.userId);
                if (!openShift) {
                    res.status(400).json({ error: 'No open shift found. Please start a shift first before billing.' });
                    return;
                }
                shiftId = openShift.id;
            }
            const bill = (0, billService_1.createSaleTransaction)(db, {
                ...req.body,
                shiftId,
                cashierId: req.user.userId,
            });
            res.status(201).json({ bill });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async holdSale(req, res) {
        const db = (0, database_1.getDb)();
        try {
            let shiftId = req.body.shiftId;
            if (!shiftId) {
                const openShift = shiftRepository_1.shiftRepo.findOpenShift(req.user.userId);
                if (!openShift) {
                    res.status(400).json({ error: 'No open shift found.' });
                    return;
                }
                shiftId = openShift.id;
            }
            const held = (0, billService_1.holdBill)(db, {
                shiftId,
                cashierId: req.user.userId,
                items: req.body.items,
                notes: req.body.notes,
            });
            res.json({ bill: held });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async getHeldBills(_req, res) {
        const db = (0, database_1.getDb)();
        const heldBills = billRepository_1.billRepo.findHeldBills();
        for (const b of heldBills) {
            b.items = billRepository_1.billRepo.findItemsByBillId(b.id);
        }
        res.json({ bills: heldBills });
    }
    static async getCustomItemsReview(_req, res) {
        const db = (0, database_1.getDb)();
        const customItems = (0, billService_1.getCustomItemsReviewList)(db);
        res.json({ items: customItems });
    }
    static async getAll(req, res) {
        const db = (0, database_1.getDb)();
        const { date, startDate, endDate, status, cashierId, search, limit = 50, offset = 0 } = req.query;
        let query = `
      SELECT b.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone
      FROM bills b
      JOIN users u ON u.id = b.cashier_id
      LEFT JOIN customers c ON c.id = b.customer_id
      WHERE 1=1
    `;
        const params = [];
        if (req.user?.role !== 'admin') {
            query += ' AND b.cashier_id = ?';
            params.push(req.user.userId);
        }
        else if (cashierId) {
            query += ' AND b.cashier_id = ?';
            params.push(cashierId);
        }
        if (date) {
            query += ' AND b.created_at LIKE ?';
            params.push(`${date}%`);
        }
        if (startDate && endDate) {
            query += ' AND b.created_at >= ? AND b.created_at <= ?';
            params.push(startDate, endDate);
        }
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (b.bill_number LIKE ? OR c.phone LIKE ? OR c.name LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }
        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const bills = db.prepare(query).all(...params);
        const getPayments = db.prepare('SELECT method, amount FROM payments WHERE bill_id = ?');
        const getItemsCount = db.prepare('SELECT count(*) as count FROM bill_items WHERE bill_id = ?');
        for (const b of bills) {
            b.payments = getPayments.all(b.id);
            b.items_count = getItemsCount.get(b.id).count;
        }
        res.json({ bills });
    }
    static async getById(req, res) {
        const id = req.params.id;
        const bill = billRepository_1.billRepo.findById(id);
        if (!bill) {
            res.status(404).json({ error: 'Bill not found.' });
            return;
        }
        const items = billRepository_1.billRepo.findItemsByBillId(bill.id);
        if (req.user?.role !== 'admin') {
            for (const it of items) {
                delete it.purchase_price_snapshot;
            }
        }
        bill.items = items;
        bill.payments = billRepository_1.billRepo.findPaymentsByBillId(bill.id);
        res.json({ bill });
    }
    static async void(req, res) {
        const db = (0, database_1.getDb)();
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ error: 'A mandatory reason is required to void a bill.' });
            return;
        }
        try {
            const result = (0, billService_1.voidBill)(db, {
                billId: req.params.id,
                adminUserId: req.user.userId,
                reason,
            });
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}
exports.BillController = BillController;
