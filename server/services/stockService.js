"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStockMovement = createStockMovement;
exports.adjustStock = adjustStock;
exports.getProductStockCard = getProductStockCard;
exports.reconcileStockCount = reconcileStockCount;
const crypto_1 = require("crypto");
const database_1 = require("../db/database");
const searchService_1 = require("./searchService");
function createStockMovement(db, data) {
    // Lock product row and get current stock
    const product = db.prepare('SELECT id, name, current_stock FROM products WHERE id = ?').get(data.productId);
    if (!product) {
        throw new Error(`Product with ID ${data.productId} not found.`);
    }
    const stockBefore = product.current_stock;
    const stockAfter = Number((stockBefore + data.qtyChange).toFixed(3));
    const id = crypto_1.default.randomUUID();
    const now = new Date().toISOString();
    // 1. Insert append-only movement
    const insertMovement = db.prepare(`
    INSERT INTO stock_movements (
      id, product_id, movement_type, qty_change, stock_before, stock_after,
      reason, reference_type, reference_id, user_id, approved_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    insertMovement.run(id, data.productId, data.movementType, data.qtyChange, stockBefore, stockAfter, data.reason || null, data.referenceType || null, data.referenceId || null, data.userId, data.approvedBy || null, now);
    // 2. Update cached stock in products table
    db.prepare(`
    UPDATE products 
    SET current_stock = ?, updated_at = datetime('now', 'localtime') 
    WHERE id = ?
  `).run(stockAfter, data.productId);
    // 3. Update search engine in-memory stock
    searchService_1.searchEngine.updateStock(data.productId, stockAfter);
    return {
        id,
        product_id: data.productId,
        product_name: product.name,
        movement_type: data.movementType,
        qty_change: data.qtyChange,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reason: data.reason || null,
        reference_type: data.referenceType || null,
        reference_id: data.referenceId || null,
        user_id: data.userId,
        approved_by: data.approvedBy || null,
        created_at: now,
    };
}
function adjustStock(db, data) {
    if (!data.reason || data.reason.trim().length === 0) {
        throw new Error('A mandatory reason is required for manual stock adjustments.');
    }
    let movement = null;
    const runTransaction = db.transaction(() => {
        movement = createStockMovement(db, {
            productId: data.productId,
            movementType: data.adjustmentType,
            qtyChange: data.qtyChange,
            reason: data.reason,
            referenceType: 'adjustment',
            userId: data.userId,
            approvedBy: data.approvedBy,
        });
        (0, database_1.logAudit)(db, {
            userId: data.userId,
            actingRole: 'admin',
            action: 'STOCK_ADJUSTMENT',
            entityType: 'stock_movements',
            entityId: movement.id,
            newValue: {
                productId: data.productId,
                type: data.adjustmentType,
                qtyChange: data.qtyChange,
                stockAfter: movement.stock_after,
                reason: data.reason,
            },
            reason: data.reason,
            approvedBy: data.approvedBy,
            severity: 'notice',
        });
    });
    runTransaction();
    return movement;
}
function getProductStockCard(db, productId, limit = 100) {
    const product = db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.id = ?
  `).get(productId);
    if (!product) {
        throw new Error('Product not found');
    }
    const movements = db.prepare(`
    SELECT 
      sm.*,
      p.name as product_name,
      u.name as user_name
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    JOIN users u ON u.id = sm.user_id
    WHERE sm.product_id = ?
    ORDER BY sm.created_at DESC
    LIMIT ?
  `).all(productId, limit);
    return { product, movements };
}
function reconcileStockCount(db, counts, userId, approvedBy) {
    const variances = [];
    let adjustmentsMade = 0;
    const runTx = db.transaction(() => {
        for (const item of counts) {
            const product = db.prepare('SELECT id, name, current_stock FROM products WHERE id = ?').get(item.productId);
            if (!product)
                continue;
            const variance = Number((item.countedQty - product.current_stock).toFixed(3));
            variances.push({
                productId: product.id,
                name: product.name,
                expectedStock: product.current_stock,
                countedStock: item.countedQty,
                variance,
            });
            if (variance !== 0) {
                const movementType = variance > 0 ? 'adjustment_found' : 'adjustment_correction';
                const reason = item.reason || `Physical inventory reconciliation variance (${variance > 0 ? '+' : ''}${variance})`;
                createStockMovement(db, {
                    productId: product.id,
                    movementType,
                    qtyChange: variance,
                    reason,
                    referenceType: 'adjustment',
                    userId,
                    approvedBy,
                });
                adjustmentsMade++;
            }
        }
        (0, database_1.logAudit)(db, {
            userId,
            actingRole: 'admin',
            action: 'STOCK_RECONCILIATION_POSTED',
            entityType: 'stock_reconciliation',
            newValue: { adjustmentsCount: adjustmentsMade, variancesCount: variances.length },
            reason: 'Physical inventory reconciliation count posted',
            approvedBy,
            severity: 'notice',
        });
    });
    runTx();
    return { adjustmentsMade, variances };
}
