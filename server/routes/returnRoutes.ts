import { Router } from 'express';
import { ReturnController } from '../controllers/returnController';
import { authMiddleware } from '../middleware/authMiddleware';

export const returnRouter = Router();

returnRouter.post('/', authMiddleware, ReturnController.processReturn);
returnRouter.get('/', authMiddleware, ReturnController.getAll);
