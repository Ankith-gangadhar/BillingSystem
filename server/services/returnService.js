"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReturn = processReturn;
const crypto_1 = require("crypto");
const database_1 = require("../db/database");
const stockService_1 = require("./stockService");
function processReturn(db, input) {
    if (!input.items || input.items.length === 0) {
        throw new Error('Return must contain at least one item.');
    }
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(input.originalBillId);
    if (!bill) {
        throw new Error('Original bill not found.');
    }
    if (bill.status === 'voided') {
        throw new Error('Cannot process return for a voided bill.');
    }
    const returnId = crypto_1.default.randomUUID();
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    let totalRefundAmount = 0;
    let result = null;
    const runTx = db.transaction(() => {
        // 1. Calculate total refund
        for (const item of input.items) {
            totalRefundAmount += Math.round(item.unitPrice * item.qty);
        }
        // 2. Insert return header
        db.prepare(`
      INSERT INTO returns (id, original_bill_id, return_number, reason, refund_method, refund_amount, user_id, approved_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(returnId, input.originalBillId, returnNumber, input.reason, input.refundMethod, totalRefundAmount, input.userId, input.approvedBy || null, now);
        // 3. Insert return items and create stock movements
        const insertReturnItem = db.prepare(`
      INSERT INTO return_items (id, return_id, product_id, item_name, qty, unit_price, total_amount, restock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        for (const item of input.items) {
            const lineTotal = Math.round(item.unitPrice * item.qty);
            insertReturnItem.run(crypto_1.default.randomUUID(), returnId, item.productId || null, item.itemName, item.qty, item.unitPrice, lineTotal, item.restock ? 1 : 0);
            // Create stock movement if restocked or damaged
            if (item.productId) {
                if (item.restock) {
                    (0, stockService_1.createStockMovement)(db, {
                        productId: item.productId,
                        movementType: 'sale_return',
                        qtyChange: item.qty, // positive return to stock
                        reason: `Return ${returnNumber} from bill ${bill.bill_number}: ${input.reason}`,
                        referenceType: 'return',
                        referenceId: returnId,
                        userId: input.userId,
                        approvedBy: input.approvedBy,
                    });
                }
                else {
                    // If not restocked to active sellable stock, record as damaged
                    (0, stockService_1.createStockMovement)(db, {
                        productId: item.productId,
                        movementType: 'adjustment_damage',
                        qtyChange: 0, // No net sellable stock change, but logs damage
                        reason: `Returned as damaged from bill ${bill.bill_number}: ${input.reason}`,
                        referenceType: 'return',
                        referenceId: returnId,
                        userId: input.userId,
                        approvedBy: input.approvedBy,
                    });
                }
            }
        }
        // 4. Update original bill status
        const allReturnsForBill = db.prepare('SELECT SUM(refund_amount) as total_refunded FROM returns WHERE original_bill_id = ?').get(input.originalBillId);
        const newStatus = (allReturnsForBill.total_refunded >= bill.grand_total) ? 'returned' : 'partially_returned';
        db.prepare('UPDATE bills SET status = ? WHERE id = ?').run(newStatus, input.originalBillId);
        // 5. Log audit entry
        (0, database_1.logAudit)(db, {
            userId: input.userId,
            actingRole: 'admin',
            action: 'RETURN_PROCESSED',
            entityType: 'returns',
            entityId: returnId,
            newValue: {
                returnNumber,
                originalBillNumber: bill.bill_number,
                refundAmount: totalRefundAmount,
                refundMethod: input.refundMethod,
                itemsCount: input.items.length,
            },
            reason: input.reason,
            approvedBy: input.approvedBy,
            severity: 'notice',
        });
        result = {
            id: returnId,
            original_bill_id: input.originalBillId,
            original_bill_number: bill.bill_number,
            return_number: returnNumber,
            reason: input.reason,
            refund_method: input.refundMethod,
            refund_amount: totalRefundAmount,
            user_id: input.userId,
            approved_by: input.approvedBy || null,
            created_at: now,
        };
    });
    runTx();
    return result;
}
