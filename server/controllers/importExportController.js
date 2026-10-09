"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportController = void 0;
const XLSX = require("xlsx");
const papaparse_1 = require("papaparse");
const database_1 = require("../db/database");
const importExportService_1 = require("../services/importExportService");
class ImportExportController {
    // Download Sample Product Import Excel Template
    static getTemplate(_req, res) {
        const buffer = (0, importExportService_1.generateExcelTemplate)();
        res.setHeader('Content-Disposition', 'attachment; filename="MangaloreStore_Products_Template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
    // Admin: Upload and Preview Import
    static preview(req, res) {
        const db = (0, database_1.getDb)();
        if (!req.file) {
            res.status(400).json({ error: 'Please upload an Excel (.xlsx, .xls) or CSV file.' });
            return;
        }
        try {
            const rawRows = (0, importExportService_1.parseFileToObjects)(req.file.buffer, req.file.originalname);
            if (!rawRows || rawRows.length === 0) {
                res.status(400).json({ error: 'The uploaded file is empty or formatted incorrectly.' });
                return;
            }
            const preview = (0, importExportService_1.validateProductImport)(db, rawRows);
            res.json({ preview });
        }
        catch (err) {
            res.status(400).json({ error: `Failed to process import file: ${err.message}` });
        }
    }
    // Admin: Execute Import
    static async execute(req, res) {
        const db = (0, database_1.getDb)();
        const { validatedRows } = req.body;
        if (!validatedRows || !Array.isArray(validatedRows)) {
            res.status(400).json({ error: 'Validated rows array is required.' });
            return;
        }
        try {
            const result = await (0, importExportService_1.executeProductImport)(db, validatedRows, req.user.userId);
            res.json({ success: true, ...result });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Admin: Export Data (Products, Bills, Inventory, Audit Logs)
    static exportData(req, res) {
        const db = (0, database_1.getDb)();
        const { type } = req.params;
        const format = req.query.format || 'xlsx';
        let data = [];
        let sheetName = 'Export';
        if (type === 'products') {
            sheetName = 'Products';
            data = db.prepare(`
        SELECT 
          p.id, p.name, p.local_name, p.sku, p.barcode, c.name as category,
          p.brand, p.unit, (p.purchase_price/100.0) as purchase_price_rs,
          (p.selling_price/100.0) as selling_price_rs, (p.mrp/100.0) as mrp_rs,
          p.gst_rate, p.current_stock, p.min_stock, s.name as supplier
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE p.is_active = 1
        ORDER BY p.name ASC
      `).all();
        }
        else if (type === 'bills') {
            sheetName = 'Bills';
            data = db.prepare(`
        SELECT 
          b.bill_number, b.created_at, b.status, u.name as cashier,
          c.name as customer, (b.subtotal/100.0) as subtotal_rs,
          (b.discount_total/100.0) as discount_rs, (b.tax_total/100.0) as tax_rs,
          (b.grand_total/100.0) as grand_total_rs, b.payment_status
        FROM bills b
        JOIN users u ON u.id = b.cashier_id
        LEFT JOIN customers c ON c.id = b.customer_id
        ORDER BY b.created_at DESC
      `).all();
        }
        else if (type === 'stock_movements') {
            sheetName = 'Stock_Movements';
            data = db.prepare(`
        SELECT 
          sm.created_at, p.name as product_name, sm.movement_type,
          sm.qty_change, sm.stock_before, sm.stock_after, sm.reason,
          u.name as user_name
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        JOIN users u ON u.id = sm.user_id
        ORDER BY sm.created_at DESC
      `).all();
        }
        else if (type === 'audit_log') {
            sheetName = 'Audit_Log';
            data = db.prepare(`
        SELECT 
          a.timestamp, u.name as user_name, a.acting_role,
          a.action, a.entity_type, a.entity_id, a.reason,
          a.severity, a.hash
        FROM audit_log a
        JOIN users u ON u.id = a.user_id
        ORDER BY a.timestamp DESC
      `).all();
        }
        else {
            res.status(400).json({ error: 'Invalid export type.' });
            return;
        }
        if (format === 'csv') {
            const csv = papaparse_1.default.unparse(data);
            res.setHeader('Content-Disposition', `attachment; filename="MangaloreStore_${sheetName}_${Date.now()}.csv"`);
            res.setHeader('Content-Type', 'text/csv');
            res.send(csv);
        }
        else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', `attachment; filename="MangaloreStore_${sheetName}_${Date.now()}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
    }
}
exports.ImportExportController = ImportExportController;
