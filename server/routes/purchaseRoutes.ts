import { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const purchaseRouter = Router();

purchaseRouter.post('/', authMiddleware, requireAdmin, PurchaseController.receive);
purchaseRouter.get('/', authMiddleware, requireAdmin, PurchaseController.getAll);
