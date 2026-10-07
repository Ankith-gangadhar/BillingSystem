import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  getDashboardSummary,
  getProductSalesReport,
  getCategorySalesReport,
  getDiscountsReport,
  getInventoryValuationReport,
  getHourlySalesHeatmap,
} from '../services/reportService';

export const reportRouter = Router();

// Dashboard Summary (Available for Cashier & Admin, profit data scoped to Admin)
reportRouter.get('/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const summary = getDashboardSummary(db, req.user?.role === 'admin' ? req.user?.userId : undefined);
  res.json({ summary });
});

// Admin: Product Sales Report
reportRouter.get('/product-sales', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startDate, endDate } = req.query;
  const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
  const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

  const report = getProductSalesReport(db, start, end, true);
  res.json({ report });
});

// Admin: Category Sales Report
reportRouter.get('/category-sales', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startDate, endDate } = req.query;
  const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
  const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

  const report = getCategorySalesReport(db, start, end);
  res.json({ report });
});

// Admin: Discounts & Overrides Feed Report
reportRouter.get('/discounts', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startDate, endDate } = req.query;
  const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
  const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

  const report = getDiscountsReport(db, start, end);
  res.json({ report });
});

// Admin: Inventory Valuation & Dead Stock Report
reportRouter.get('/inventory-valuation', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const deadStockDays = req.query.deadDays ? parseInt(req.query.deadDays as string) : 30;
  const report = getInventoryValuationReport(db, deadStockDays);
  res.json({ report });
});

// Admin: Hourly Sales Heatmap
reportRouter.get('/hourly-heatmap', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startDate, endDate } = req.query;
  const start = (startDate as string) || `${new Date().toISOString().slice(0, 10)} 00:00:00`;
  const end = (endDate as string) || `${new Date().toISOString().slice(0, 10)} 23:59:59`;

  const heatmap = getHourlySalesHeatmap(db, start, end);
  res.json({ heatmap });
});
