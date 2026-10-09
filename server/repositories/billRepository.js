"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billRepo = exports.BillRepository = void 0;
const database_1 = require("../db/database");
class BillRepository {
    db;
    constructor(db = (0, database_1.getDb)()) {
        this.db = db;
    }
    findById(id) {
        return this.db.prepare(`
      SELECT 
        b.*,
        u.name as cashier_name,
        c.name as customer_name,
        c.phone as customer_phone,
        app.name as approved_by_name,
        vby.name as voided_by_name
      FROM bills b
      JOIN users u ON u.id = b.cashier_id
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN users app ON app.id = b.approved_by
      LEFT JOIN users vby ON vby.id = b.voided_by
      WHERE b.id = ?
    `).get(id);
    }
    findItemsByBillId(billId) {
        return this.db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(billId);
    }
    findPaymentsByBillId(billId) {
        return this.db.prepare('SELECT * FROM payments WHERE bill_id = ?').all(billId);
    }
    findHeldBills() {
        return this.db.prepare(`
      SELECT b.*, u.name as cashier_name
      FROM bills b
      JOIN users u ON u.id = b.cashier_id
      WHERE b.status = 'held'
      ORDER BY b.created_at DESC
    `).all();
    }
    createBill(bill) {
        this.db.prepare(`
      INSERT INTO bills (
        id, bill_number, status, shift_id, cashier_id, customer_id,
        subtotal, discount_total, tax_total, round_off, grand_total,
        payment_status, notes, created_at, completed_at, approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        bill_number = excluded.bill_number,
        status = excluded.status,
        subtotal = excluded.subtotal,
        discount_total = excluded.discount_total,
        tax_total = excluded.tax_total,
        round_off = excluded.round_off,
        grand_total = excluded.grand_total,
        payment_status = excluded.payment_status,
        notes = excluded.notes,
        completed_at = excluded.completed_at,
        approved_by = excluded.approved_by
    `).run(bill.id, bill.bill_number, bill.status, bill.shift_id, bill.cashier_id, bill.customer_id || null, bill.subtotal, bill.discount_total, bill.tax_total, bill.round_off, bill.grand_total, bill.payment_status, bill.notes || null, bill.created_at, bill.completed_at || null, bill.approved_by || null);
    }
    createBillItem(item) {
        this.db.prepare(`
      INSERT INTO bill_items (
        id, bill_id, product_id, is_custom, name_snapshot, sku_snapshot,
        qty, unit, list_price_snapshot, sold_price, line_discount, gst_rate,
        tax_amount, line_total, purchase_price_snapshot, price_override_reason, override_approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.bill_id, item.product_id || null, item.is_custom, item.name_snapshot, item.sku_snapshot || null, item.qty, item.unit, item.list_price_snapshot, item.sold_price, item.line_discount, item.gst_rate, item.tax_amount, item.line_total, item.purchase_price_snapshot || null, item.price_override_reason || null, item.override_approved_by || null);
    }
    createPayment(payment) {
        this.db.prepare(`
      INSERT INTO payments (
        id, bill_id, method, amount, reference, tendered_amount, change_amount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(payment.id, payment.bill_id, payment.method, payment.amount, payment.reference || null, payment.tendered_amount || null, payment.change_amount || null, payment.created_at);
    }
    markVoided(billId, voidedAt, voidedBy, reason) {
        this.db.prepare(`
      UPDATE bills 
      SET status = 'voided', voided_at = ?, voided_by = ?, void_reason = ?
      WHERE id = ?
    `).run(voidedAt, voidedBy, reason, billId);
    }
}
exports.BillRepository = BillRepository;
exports.billRepo = new BillRepository();
