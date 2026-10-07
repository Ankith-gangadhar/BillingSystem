import { Router } from 'express';
import { BillController } from '../controllers/billController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const billRouter = Router();

billRouter.post('/', authMiddleware, BillController.createSale);
billRouter.post('/hold', authMiddleware, BillController.holdSale);
billRouter.get('/held', authMiddleware, BillController.getHeldBills);
billRouter.get('/custom-items/review', authMiddleware, requireAdmin, BillController.getCustomItemsReview);
billRouter.get('/', authMiddleware, BillController.getAll);
billRouter.get('/:id', authMiddleware, BillController.getById);
billRouter.post('/:id/void', authMiddleware, requireAdmin, BillController.void);
