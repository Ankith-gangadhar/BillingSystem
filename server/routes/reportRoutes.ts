import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const reportRouter = Router();

reportRouter.get('/dashboard', authMiddleware, ReportController.getDashboard);
reportRouter.get('/product-sales', authMiddleware, requireAdmin, ReportController.getProductSales);
reportRouter.get('/category-sales', authMiddleware, requireAdmin, ReportController.getCategorySales);
reportRouter.get('/discounts', authMiddleware, requireAdmin, ReportController.getDiscounts);
reportRouter.get('/inventory-valuation', authMiddleware, requireAdmin, ReportController.getInventoryValuation);
reportRouter.get('/hourly-heatmap', authMiddleware, requireAdmin, ReportController.getHourlyHeatmap);
