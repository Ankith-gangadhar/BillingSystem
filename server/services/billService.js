"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyBillNumber = generateDailyBillNumber;
exports.createSaleTransaction = createSaleTransaction;
exports.holdBill = holdBill;
exports.voidBill = voidBill;
exports.getCustomItemsReviewList = getCustomItemsReviewList;
const crypto_1 = require("crypto");
const database_1 = require("../db/database");
const stockService_1 = require("./stockService");
function generateDailyBillNumber(db, prefix = 'MS') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;
    const row = db.prepare(`
    INSERT INTO daily_bill_counters (date_key, last_seq)
    VALUES (?, 1)
    ON CONFLICT(date_key) DO UPDATE SET last_seq = last_seq + 1
    RETURNING last_seq
  `).get(dateKey);
    const seqStr = String(row.last_seq).padStart(4, '0');
    return `${prefix}-${dateKey}-${seqStr}`;
}
function createSaleTransaction(db, input) {
    if (!input.items || input.items.length === 0) {
        throw new Error('Cart cannot be empty to complete a sale.');
    }
    const settings = (0, database_1.getSettings)(db);
    const billId = input.heldBillIdToResume || crypto_1.default.randomUUID();
    const billNumber = generateDailyBillNumber(db, settings.bill_prefix || 'MS');
    const now = new Date().toISOString();
    let completedBill = null;
    const runTx = db.transaction(() => {
        // 1. Calculate items and distribute bill-level discount if any
        let rawSubtotal = 0;
        let itemsLineDiscountTotal = 0;
        let preTaxTotal = 0;
        let taxTotal = 0;
        // Check stock for all non-custom items first
        for (const item of input.items) {
            if (!item.isCustom && item.productId) {
                const prod = db.prepare('SELECT id, name, current_stock FROM products WHERE id = ?').get(item.productId);
                if (!prod) {
                    throw new Error(`Product not found: ${item.name}`);
                }
                if (!settings.allow_negative_stock && !input.allowNegativeStockOverride) {
                    if (prod.current_stock < item.qty) {
                        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.current_stock}, Requested: ${item.qty}`);
                    }
                }
            }
        }
        const preparedItems = [];
        const billDiscount = input.billDiscountTotal || 0;
        for (const item of input.items) {
            const listPrice = item.listPrice;
            let soldPrice = item.soldPrice !== undefined ? item.soldPrice : listPrice;
            const qty = item.qty;
            const unit = item.unit || 'piece';
            const gstRate = settings.gst_enabled ? (item.gstRate || 0) : 0;
            const lineListTotal = Math.round(listPrice * qty);
            let lineSoldTotal = Math.round(soldPrice * qty);
            let lineDiscount = lineListTotal - lineSoldTotal;
            if (lineDiscount < 0)
                lineDiscount = 0;
            rawSubtotal += lineListTotal;
            itemsLineDiscountTotal += lineDiscount;
            preparedItems.push({
                id: crypto_1.default.randomUUID(),
                productId: item.productId || null,
                isCustom: item.isCustom ? 1 : 0,
                name: item.name,
                sku: item.sku || null,
                qty,
                unit,
                listPrice,
                soldPrice,
                lineDiscount,
                gstRate,
                taxAmount: 0, // calculated below
                lineTotal: lineSoldTotal,
                purchasePrice: item.purchasePrice || null,
                priceOverrideReason: item.priceOverrideReason || null,
                overrideApprovedBy: item.overrideApprovedBy || null,
            });
        }
        // Keep individual item rates clean and track bill-level discount separately
        let totalDiscount = itemsLineDiscountTotal + billDiscount;
        // Compute GST and Grand Total
        let grandTotalBeforeRound = 0;
        for (const pItem of preparedItems) {
            // Proportional net for tax calculation
            const lineFraction = rawSubtotal > 0 ? (pItem.listPrice * pItem.qty) / rawSubtotal : 0;
            const effectiveLineDisc = pItem.lineDiscount + (billDiscount > 0 ? Math.round(billDiscount * lineFraction) : 0);
            const lineNet = Math.max(0, Math.round(pItem.listPrice * pItem.qty) - effectiveLineDisc);
            if (settings.gst_enabled && pItem.gstRate > 0) {
                if (settings.prices_include_gst) {
                    // Backward calculation: Tax = Total - (Total / (1 + Rate/100))
                    const basePrice = lineNet / (1 + pItem.gstRate / 100);
                    pItem.taxAmount = Math.round(lineNet - basePrice);
                }
                else {
                    // Forward calculation: Tax = Total * (Rate/100)
                    pItem.taxAmount = Math.round(lineNet * (pItem.gstRate / 100));
                }
            }
            taxTotal += pItem.taxAmount;
        }
        grandTotalBeforeRound = Math.max(0, rawSubtotal - totalDiscount) + (settings.prices_include_gst ? 0 : taxTotal);
        // Round-off to nearest ₹1 (100 paise) if enabled
        let roundOff = 0;
        let finalGrandTotal = grandTotalBeforeRound;
        if (settings.round_off_enabled) {
            const roundedRupees = Math.round(grandTotalBeforeRound / 100);
            finalGrandTotal = roundedRupees * 100;
            roundOff = finalGrandTotal - grandTotalBeforeRound;
        }
        // 2. Insert Bill Record
        const insertBill = db.prepare(`
      INSERT INTO bills (
        id, bill_number, status, shift_id, cashier_id, customer_id,
        subtotal, discount_total, tax_total, round_off, grand_total,
        payment_status, notes, created_at, completed_at, approved_by
      ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        bill_number = excluded.bill_number,
        status = 'completed',
        subtotal = excluded.subtotal,
        discount_total = excluded.discount_total,
        tax_total = excluded.tax_total,
        round_off = excluded.round_off,
        grand_total = excluded.grand_total,
        payment_status = 'paid',
        notes = excluded.notes,
        completed_at = excluded.completed_at,
        approved_by = excluded.approved_by
    `);
        insertBill.run(billId, billNumber, input.shiftId, input.cashierId, input.customerId || null, rawSubtotal, totalDiscount, taxTotal, roundOff, finalGrandTotal, input.notes || null, now, now, input.approvedBy || null);
        // 3. Insert Line Items & Deduct Stock Movements
        const insertItem = db.prepare(`
      INSERT INTO bill_items (
        id, bill_id, product_id, is_custom, name_snapshot, sku_snapshot,
        qty, unit, list_price_snapshot, sold_price, line_discount, gst_rate,
        tax_amount, line_total, purchase_price_snapshot, price_override_reason, override_approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        for (const pItem of preparedItems) {
            insertItem.run(pItem.id, billId, pItem.productId, pItem.isCustom, pItem.name, pItem.sku, pItem.qty, pItem.unit, pItem.listPrice, pItem.soldPrice, pItem.lineDiscount, pItem.gstRate, pItem.taxAmount, pItem.lineTotal, pItem.purchasePrice, pItem.priceOverrideReason, pItem.overrideApprovedBy);
            // Create stock movement for standard inventory products
            if (!pItem.isCustom && pItem.productId) {
                (0, stockService_1.createStockMovement)(db, {
                    productId: pItem.productId,
                    movementType: 'sale',
                    qtyChange: -pItem.qty,
                    reason: `Sale ${billNumber}`,
                    referenceType: 'bill',
                    referenceId: billId,
                    userId: input.cashierId,
                    approvedBy: input.approvedBy,
                });
            }
            else if (pItem.isCustom) {
                // Log custom unlisted item added
                (0, database_1.logAudit)(db, {
                    userId: input.cashierId,
                    actingRole: 'cashier',
                    action: 'CUSTOM_ITEM_SOLD',
                    entityType: 'bill_items',
                    entityId: pItem.id,
                    newValue: { name: pItem.name, qty: pItem.qty, price: pItem.soldPrice, billNumber },
                    reason: 'Custom unlisted item billed',
                    severity: 'notice',
                });
            }
        }
        // 4. Insert Payments
        const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, bill_id, method, amount, reference, tendered_amount, change_amount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        for (const p of input.payments) {
            insertPayment.run(crypto_1.default.randomUUID(), billId, p.method, p.amount, p.reference || null, p.tenderedAmount || null, p.changeAmount || null, now);
        }
        // 5. Log Audit Record
        (0, database_1.logAudit)(db, {
            userId: input.cashierId,
            actingRole: 'cashier',
            action: 'SALE_COMPLETED',
            entityType: 'bills',
            entityId: billId,
            newValue: {
                billNumber,
                grandTotal: finalGrandTotal,
                itemsCount: preparedItems.length,
                discountTotal: totalDiscount,
            },
            approvedBy: input.approvedBy,
            severity: totalDiscount > 0 ? 'notice' : 'info',
        });
        completedBill = {
            id: billId,
            bill_number: billNumber,
            status: 'completed',
            shift_id: input.shiftId,
            cashier_id: input.cashierId,
            customer_id: input.customerId || null,
            subtotal: rawSubtotal,
            discount_total: totalDiscount,
            tax_total: taxTotal,
            round_off: roundOff,
            grand_total: finalGrandTotal,
            payment_status: 'paid',
            notes: input.notes || null,
            created_at: now,
            completed_at: now,
            voided_at: null,
            voided_by: null,
            void_reason: null,
            approved_by: input.approvedBy || null,
            items: preparedItems,
            payments: input.payments,
        };
    });
    runTx();
    return completedBill;
}
// Hold a Bill (Park sale)
function holdBill(db, data) {
    const billId = crypto_1.default.randomUUID();
    const billNumber = `HELD-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    let subtotal = 0;
    for (const item of data.items) {
        subtotal += Math.round((item.soldPrice || item.listPrice) * item.qty);
    }
    const runTx = db.transaction(() => {
        db.prepare(`
      INSERT INTO bills (
        id, bill_number, status, shift_id, cashier_id,
        subtotal, discount_total, tax_total, round_off, grand_total,
        payment_status, notes, created_at
      ) VALUES (?, ?, 'held', ?, ?, ?, 0, 0, 0, ?, 'unpaid', ?, ?)
    `).run(billId, billNumber, data.shiftId, data.cashierId, subtotal, subtotal, data.notes || null, now);
        const insertItem = db.prepare(`
      INSERT INTO bill_items (
        id, bill_id, product_id, is_custom, name_snapshot, sku_snapshot,
        qty, unit, list_price_snapshot, sold_price, line_discount, gst_rate,
        tax_amount, line_total, purchase_price_snapshot, price_override_reason, override_approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        for (const item of data.items) {
            insertItem.run(crypto_1.default.randomUUID(), billId, item.productId || null, item.isCustom ? 1 : 0, item.name, item.sku || null, item.qty, item.unit || 'piece', item.listPrice || 0, item.soldPrice || item.listPrice || 0, item.lineDiscount || 0, item.gstRate || 0, 0, Math.round((item.soldPrice || item.listPrice) * item.qty), null, null, null);
        }
    });
    runTx();
    return db.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
}
// Void a Completed Bill (Admin only, restores inventory)
function voidBill(db, data) {
    if (!data.reason || data.reason.trim().length === 0) {
        throw new Error('A mandatory reason is required to void a completed bill.');
    }
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(data.billId);
    if (!bill) {
        throw new Error('Bill not found.');
    }
    if (bill.status === 'voided') {
        throw new Error('Bill is already voided.');
    }
    const now = new Date().toISOString();
    const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ?').all(data.billId);
    const runTx = db.transaction(() => {
        // 1. Restore stock movements for all inventory items
        for (const item of items) {
            if (item.product_id && item.is_custom === 0) {
                (0, stockService_1.createStockMovement)(db, {
                    productId: item.product_id,
                    movementType: 'void_restore',
                    qtyChange: item.qty, // positive restore
                    reason: `Void of bill ${bill.bill_number}: ${data.reason}`,
                    referenceType: 'bill',
                    referenceId: bill.id,
                    userId: data.adminUserId,
                    approvedBy: data.adminUserId,
                });
            }
        }
        // 2. Mark bill as voided
        db.prepare(`
      UPDATE bills 
      SET status = 'voided', voided_at = ?, voided_by = ?, void_reason = ?
      WHERE id = ?
    `).run(now, data.adminUserId, data.reason, data.billId);
        // 3. Log high severity audit entry
        (0, database_1.logAudit)(db, {
            userId: data.adminUserId,
            actingRole: 'admin',
            action: 'BILL_VOIDED',
            entityType: 'bills',
            entityId: bill.id,
            oldValue: { status: bill.status, grandTotal: bill.grand_total },
            newValue: { status: 'voided', voidedAt: now, reason: data.reason },
            reason: data.reason,
            approvedBy: data.adminUserId,
            severity: 'warning',
        });
    });
    runTx();
    const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(data.billId);
    return { success: true, bill: updated };
}
// Custom items awaiting review aggregation
function getCustomItemsReviewList(db) {
    return db.prepare(`
    SELECT 
      name_snapshot as name,
      COUNT(*) as count,
      SUM(line_total) as total_revenue,
      MAX(b.created_at) as last_sold_at,
      MAX(sold_price) as last_sold_price
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE bi.is_custom = 1 AND b.status = 'completed'
    GROUP BY name_snapshot
    ORDER BY count DESC, total_revenue DESC
  `).all();
}
