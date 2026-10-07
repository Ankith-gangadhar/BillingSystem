import { Response } from 'express';
import { getDb } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  getDashboardSummary,
  getProductSalesReport,
  getCategorySalesReport,
  getDiscountsReport,
  getInventoryValuationReport,
  getHourlySalesHeatmap,
} from '../services/reportService';

export class ReportController {
  // Dashboard Summary (Available for Cashier & Admin, profit data scoped to Admin)
  static getDashboard(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const summary = getDashboardSummary(db, req.user?.role === 'admin' ? req.user?.userId : undefined);
    res.json({ summary });
  }

  // Admin: Product Sales Report
  static getProductSales(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    const report = getProductSalesReport(db, start, end, true);
    res.json({ report });
  }

  // Admin: Category Sales Report
  static getCategorySales(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    const report = getCategorySalesReport(db, start, end);
    res.json({ report });
  }

  // Admin: Discounts & Overrides Feed Report
  static getDiscounts(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    const report = getDiscountsReport(db, start, end);
    res.json({ report });
  }

  // Admin: Inventory Valuation & Dead Stock Report
  static getInventoryValuation(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const deadStockDays = req.query.deadDays ? parseInt(req.query.deadDays as string) : 30;
    const report = getInventoryValuationReport(db, deadStockDays);
    res.json({ report });
  }

  // Admin: Hourly Sales Heatmap
  static getHourlyHeatmap(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    const heatmap = getHourlySalesHeatmap(db, start, end);
    res.json({ heatmap });
  }
}
