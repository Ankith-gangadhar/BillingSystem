import { Router } from 'express';
import { ShiftController } from '../controllers/shiftController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const shiftRouter = Router();

shiftRouter.post('/start', authMiddleware, ShiftController.start);
shiftRouter.get('/current', authMiddleware, ShiftController.getCurrent);
shiftRouter.post('/cash-events', authMiddleware, ShiftController.addCashEvent);
shiftRouter.post('/:id/close', authMiddleware, ShiftController.close);
shiftRouter.get('/', authMiddleware, requireAdmin, ShiftController.getAll);
shiftRouter.get('/activity-report', authMiddleware, requireAdmin, ShiftController.getActivityReport);
shiftRouter.post('/day-close', authMiddleware, requireAdmin, ShiftController.closeDay);
shiftRouter.get('/day-closings', authMiddleware, requireAdmin, ShiftController.getDayClosings);
