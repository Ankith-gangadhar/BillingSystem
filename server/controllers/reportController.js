"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const database_1 = require("../db/database");
const reportService_1 = require("../services/reportService");
class ReportController {
    // Dashboard Summary (Available for Cashier & Admin, profit data scoped to Admin)
    static getDashboard(req, res) {
        const db = (0, database_1.getDb)();
        const summary = (0, reportService_1.getDashboardSummary)(db, req.user?.role === 'admin' ? req.user?.userId : undefined);
        res.json({ summary });
    }
    // Admin: Product Sales Report
    static getProductSales(req, res) {
        const db = (0, database_1.getDb)();
        const { startDate, endDate } = req.query;
        const start = startDate || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
        const end = endDate || `${new Date().toISOString().slice(0, 10)} 23:59:59`;
        const report = (0, reportService_1.getProductSalesReport)(db, start, end, true);
        res.json({ report });
    }
    // Admin: Category Sales Report
    static getCategorySales(req, res) {
        const db = (0, database_1.getDb)();
        const { startDate, endDate } = req.query;
        const start = startDate || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
        const end = endDate || `${new Date().toISOString().slice(0, 10)} 23:59:59`;
        const report = (0, reportService_1.getCategorySalesReport)(db, start, end);
        res.json({ report });
    }
    // Admin: Discounts & Overrides Feed Report
    static getDiscounts(req, res) {
        const db = (0, database_1.getDb)();
        const { startDate, endDate } = req.query;
        const start = startDate || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
        const end = endDate || `${new Date().toISOString().slice(0, 10)} 23:59:59`;
        const report = (0, reportService_1.getDiscountsReport)(db, start, end);
        res.json({ report });
    }
    // Admin: Inventory Valuation & Dead Stock Report
    static getInventoryValuation(req, res) {
        const db = (0, database_1.getDb)();
        const deadStockDays = req.query.deadDays ? parseInt(req.query.deadDays) : 30;
        const report = (0, reportService_1.getInventoryValuationReport)(db, deadStockDays);
        res.json({ report });
    }
    // Admin: Hourly Sales Heatmap
    static getHourlyHeatmap(req, res) {
        const db = (0, database_1.getDb)();
        const { startDate, endDate } = req.query;
        const start = startDate || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
        const end = endDate || `${new Date().toISOString().slice(0, 10)} 23:59:59`;
        const heatmap = (0, reportService_1.getHourlySalesHeatmap)(db, start, end);
        res.json({ heatmap });
    }
}
exports.ReportController = ReportController;
