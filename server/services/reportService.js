"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = getDashboardSummary;
exports.getProductSalesReport = getProductSalesReport;
exports.getCategorySalesReport = getCategorySalesReport;
exports.getDiscountsReport = getDiscountsReport;
exports.getInventoryValuationReport = getInventoryValuationReport;
exports.getHourlySalesHeatmap = getHourlySalesHeatmap;
const shiftService_1 = require("./shiftService");
const database_1 = require("../db/database");
function getDashboardSummary(db, adminUserId) {
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today} 00:00:00`;
    const endOfDay = `${today} 23:59:59`;
    // 1. Sales & Bills for today
    const salesRow = db.prepare(`
    SELECT 
      COUNT(*) as bills_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(AVG(grand_total), 0) as avg_bill
    FROM bills 
    WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
  `).get(startOfDay, endOfDay);
    // 2. Payment split
    const paymentSplit = db.prepare(`
    SELECT p.method, COALESCE(SUM(p.amount), 0) as total
    FROM payments p
    JOIN bills b ON b.id = p.bill_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
    GROUP BY p.method
  `).all(startOfDay, endOfDay);
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let otherSales = 0;
    for (const p of paymentSplit) {
        if (p.method === 'cash')
            cashSales = p.total;
        if (p.method === 'upi')
            upiSales = p.total;
        if (p.method === 'card')
            cardSales = p.total;
        if (p.method === 'other')
            otherSales = p.total;
    }
    // 3. Discounts (Cashier vs Admin)
    const discountsRow = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN u.role = 'cashier' AND b.approved_by IS NULL THEN b.discount_total ELSE 0 END), 0) as cashier_disc,
      COALESCE(SUM(CASE WHEN u.role = 'admin' OR b.approved_by IS NOT NULL THEN b.discount_total ELSE 0 END), 0) as admin_disc
    FROM bills b
    JOIN users u ON u.id = b.cashier_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
  `).get(startOfDay, endOfDay);
    // 4. Returns & Voids today
    const returnsRow = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) as returns_total
    FROM returns 
    WHERE created_at >= ? AND created_at <= ?
  `).get(startOfDay, endOfDay);
    const voidsRow = db.prepare(`
    SELECT COUNT(*) as voids_count 
    FROM bills 
    WHERE created_at >= ? AND created_at <= ? AND status = 'voided'
  `).get(startOfDay, endOfDay);
    // 5. Estimated Gross Profit (Admin only)
    let estimatedGrossProfit = 0;
    if (adminUserId) {
        const profitRow = db.prepare(`
      SELECT 
        SUM(bi.line_total - (COALESCE(bi.purchase_price_snapshot, p.purchase_price, 0) * bi.qty)) as profit
      FROM bill_items bi
      JOIN bills b ON b.id = bi.bill_id
      LEFT JOIN products p ON p.id = bi.product_id
      WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
    `).get(startOfDay, endOfDay);
        estimatedGrossProfit = profitRow.profit || 0;
    }
    // 6. Stock counts
    const stockCounts = db.prepare(`
    SELECT 
      SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock THEN 1 ELSE 0 END) as low_stock
    FROM products 
    WHERE is_active = 1
  `).get();
    // 7. Custom items pending review
    const customItemsPending = db.prepare(`
    SELECT COUNT(DISTINCT name_snapshot) as count 
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    WHERE bi.is_custom = 1 AND b.status = 'completed'
  `).get();
    // 8. Backup Status
    const lastBackup = db.prepare(`
    SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1
  `).get();
    let daysAgo = 999;
    let backupStatus = 'critical';
    if (lastBackup) {
        const diffMs = Date.now() - new Date(lastBackup.created_at).getTime();
        daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysAgo <= 1)
            backupStatus = 'good';
        else if (daysAgo <= 3)
            backupStatus = 'warning';
        else
            backupStatus = 'critical';
    }
    // 9. Stock Integrity
    const stockIntegrity = (0, database_1.verifyStockIntegrity)(db);
    // 10. Open shift
    const openShift = (0, shiftService_1.getCurrentOpenShift)(db);
    // 11. "While you were away" banner calculation
    let awaySummary = null;
    const lastAdminAudit = db.prepare(`
    SELECT timestamp FROM audit_log 
    WHERE acting_role = 'admin' AND action IN ('LOGIN_SUCCESS', 'OWNER_PRESENCE_TOGGLED')
    ORDER BY timestamp DESC LIMIT 1 OFFSET 1
  `).get();
    if (lastAdminAudit) {
        const awayReport = (0, shiftService_1.getTimeRangeActivityReport)(db, lastAdminAudit.timestamp, new Date().toISOString());
        awaySummary = {
            from_time: awayReport.from_time,
            to_time: awayReport.to_time,
            bills_count: awayReport.bills_count,
            total_sales: awayReport.total_sales,
            cash_sales: awayReport.cash_sales,
            upi_sales: awayReport.upi_sales,
            discounts_count: awayReport.discounts_count,
            discounts_total: awayReport.discounts_total,
            custom_items_count: awayReport.custom_items_count,
            voids_count: awayReport.voids_count,
        };
    }
    return {
        today_sales: salesRow.total_sales,
        today_bills_count: salesRow.bills_count,
        avg_bill_amount: Math.round(salesRow.avg_bill),
        cash_sales: cashSales,
        upi_sales: upiSales,
        card_sales: cardSales,
        other_sales: otherSales,
        cashier_discounts: discountsRow.cashier_disc,
        admin_discounts: discountsRow.admin_disc,
        returns_today: returnsRow.returns_total,
        estimated_gross_profit: adminUserId ? estimatedGrossProfit : undefined,
        low_stock_count: stockCounts.low_stock || 0,
        out_of_stock_count: stockCounts.out_of_stock || 0,
        custom_items_pending: customItemsPending.count,
        voids_today_count: voidsRow.voids_count,
        last_backup: {
            date: lastBackup ? lastBackup.created_at : 'Never',
            status: backupStatus,
            days_ago: daysAgo,
        },
        stock_integrity: {
            status: stockIntegrity.healthy ? 'healthy' : 'mismatch',
            mismatched_products_count: stockIntegrity.mismatches.length,
        },
        open_shift: openShift,
        away_summary: awaySummary,
    };
}
// Product-wise Sales Report (with Gross Profit for Admin)
function getProductSalesReport(db, startDate, endDate, isAdmin = false) {
    const query = `
    SELECT 
      COALESCE(p.id, 'custom') as product_id,
      bi.name_snapshot as name,
      COALESCE(c.name, 'Uncategorized') as category_name,
      p.current_stock,
      p.unit,
      SUM(bi.qty) as units_sold,
      SUM(bi.line_total) as revenue,
      SUM(bi.line_discount) as total_discounts
      ${isAdmin
        ? `, SUM(bi.line_total - (COALESCE(bi.purchase_price_snapshot, p.purchase_price, 0) * bi.qty)) as estimated_profit`
        : ''}
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
    GROUP BY bi.name_snapshot, p.id
    ORDER BY revenue DESC
  `;
    return db.prepare(query).all(startDate, endDate);
}
// Category-wise Sales Report
function getCategorySalesReport(db, startDate, endDate) {
    return db.prepare(`
    SELECT 
      COALESCE(c.name, 'Custom / Uncategorized') as category_name,
      COUNT(DISTINCT b.id) as bills_count,
      SUM(bi.qty) as total_units_sold,
      SUM(bi.line_total) as total_revenue
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.status = 'completed'
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `).all(startDate, endDate);
}
// Discounts & Overrides Feed Report
function getDiscountsReport(db, startDate, endDate) {
    return db.prepare(`
    SELECT 
      b.id as bill_id,
      b.bill_number,
      b.created_at,
      b.grand_total,
      b.discount_total,
      u.name as cashier_name,
      u.role as cashier_role,
      app.name as approved_by_name,
      (
        SELECT GROUP_CONCAT(name_snapshot || ' (₹' || (sold_price/100.0) || ' vs ₹' || (list_price_snapshot/100.0) || ')' || COALESCE(' [' || price_override_reason || ']', ''))
        FROM bill_items bi
        WHERE bi.bill_id = b.id AND bi.line_discount > 0
      ) as discounted_items
    FROM bills b
    JOIN users u ON u.id = b.cashier_id
    LEFT JOIN users app ON app.id = b.approved_by
    WHERE b.created_at >= ? AND b.created_at <= ? AND b.discount_total > 0 AND b.status = 'completed'
    ORDER BY b.created_at DESC
  `).all(startDate, endDate);
}
// Inventory Valuation & Slow/Dead Stock Report
function getInventoryValuationReport(db, deadStockDays = 30) {
    const deadDate = new Date(Date.now() - deadStockDays * 24 * 60 * 60 * 1000).toISOString();
    const products = db.prepare(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.barcode,
      c.name as category_name,
      s.name as supplier_name,
      p.unit,
      p.current_stock,
      p.min_stock,
      p.purchase_price,
      p.selling_price,
      (p.current_stock * p.purchase_price) as cost_valuation,
      (p.current_stock * p.selling_price) as retail_valuation,
      MAX(b.created_at) as last_sold_at
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN bill_items bi ON bi.product_id = p.id
    LEFT JOIN bills b ON b.id = bi.bill_id AND b.status = 'completed'
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all();
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let deadStockCount = 0;
    let lowStockCount = 0;
    for (const p of products) {
        totalCostValuation += p.cost_valuation || 0;
        totalRetailValuation += p.retail_valuation || 0;
        if (p.current_stock <= p.min_stock)
            lowStockCount++;
        if (!p.last_sold_at || p.last_sold_at < deadDate) {
            deadStockCount++;
            p.is_dead_stock = true;
        }
        else {
            p.is_dead_stock = false;
        }
    }
    return {
        total_cost_valuation: totalCostValuation,
        total_retail_valuation: totalRetailValuation,
        total_products_count: products.length,
        low_stock_count: lowStockCount,
        dead_stock_count: deadStockCount,
        products,
    };
}
// Hourly Sales Heatmap
function getHourlySalesHeatmap(db, startDate, endDate) {
    return db.prepare(`
    SELECT 
      strftime('%H', created_at) as hour,
      COUNT(*) as bills_count,
      SUM(grand_total) as total_sales
    FROM bills 
    WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
    GROUP BY strftime('%H', created_at)
    ORDER BY hour ASC
  `).all(startDate, endDate);
}
