import { Database } from 'better-sqlite3';
import crypto from 'crypto';
import { PurchaseRecord } from '../../shared/types';
import { logAudit } from '../db/database';
import { createStockMovement } from './stockService';

export interface ReceivePurchaseInput {
  supplierId?: string | null;
  invoiceNumber: string;
  date: string;
  items: Array<{
    productId: string;
    qty: number;
    costPrice: number; // Paise
    updateProductCost?: boolean;
  }>;
  userId: string;
}

export function receivePurchase(db: Database, input: ReceivePurchaseInput): PurchaseRecord {
  if (!input.items || input.items.length === 0) {
    throw new Error('Purchase must contain at least one item.');
  }

  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();
  let totalAmount = 0;
  let record: PurchaseRecord | null = null;

  const runTx = db.transaction(() => {
    for (const item of input.items) {
      totalAmount += Math.round(item.costPrice * item.qty);
    }

    // 1. Insert Purchase
    db.prepare(`
      INSERT INTO purchases (id, supplier_id, invoice_number, date, total_amount, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(purchaseId, input.supplierId || null, input.invoiceNumber, input.date, totalAmount, input.userId, now);

    // 2. Insert Items & Create Stock Movements
    const insertItem = db.prepare(`
      INSERT INTO purchase_items (id, purchase_id, product_id, qty, cost_price, line_total, update_product_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of input.items) {
      const lineTotal = Math.round(item.costPrice * item.qty);
      insertItem.run(
        crypto.randomUUID(),
        purchaseId,
        item.productId,
        item.qty,
        item.costPrice,
        lineTotal,
        item.updateProductCost !== false ? 1 : 0
      );

      // Stock movement
      createStockMovement(db, {
        productId: item.productId,
        movementType: 'purchase',
        qtyChange: item.qty,
        reason: `Purchase Inv #${input.invoiceNumber}`,
        referenceType: 'purchase',
        referenceId: purchaseId,
        userId: input.userId,
      });

      // Update product cost if selected
      if (item.updateProductCost !== false) {
        const prod = db.prepare('SELECT purchase_price FROM products WHERE id = ?').get(item.productId) as any;
        if (prod && prod.purchase_price !== item.costPrice) {
          db.prepare('UPDATE products SET purchase_price = ? WHERE id = ?').run(item.costPrice, item.productId);

          logAudit(db, {
            userId: input.userId,
            actingRole: 'admin',
            action: 'PRODUCT_COST_UPDATED_FROM_PURCHASE',
            entityType: 'products',
            entityId: item.productId,
            oldValue: { purchase_price: prod.purchase_price },
            newValue: { purchase_price: item.costPrice },
            reason: `Updated from purchase invoice #${input.invoiceNumber}`,
            severity: 'info',
          });
        }
      }
    }

    logAudit(db, {
      userId: input.userId,
      actingRole: 'admin',
      action: 'PURCHASE_RECEIVED',
      entityType: 'purchases',
      entityId: purchaseId,
      newValue: {
        invoiceNumber: input.invoiceNumber,
        totalAmount,
        itemsCount: input.items.length,
      },
      severity: 'info',
    });

    record = {
      id: purchaseId,
      supplier_id: input.supplierId || null,
      invoice_number: input.invoiceNumber,
      date: input.date,
      total_amount: totalAmount,
      user_id: input.userId,
      created_at: now,
    };
  });

  runTx();
  return record!;
}
