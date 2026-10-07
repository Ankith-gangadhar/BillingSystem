import { Router } from 'express';
import { StockController } from '../controllers/stockController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const stockRouter = Router();

stockRouter.get('/card/:productId', authMiddleware, requireAdmin, StockController.getStockCard);
stockRouter.post('/adjust', authMiddleware, requireAdmin, StockController.adjust);
stockRouter.post('/reconcile', authMiddleware, requireAdmin, StockController.reconcile);
stockRouter.get('/integrity', authMiddleware, requireAdmin, StockController.getIntegrity);
