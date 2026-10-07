import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const backupRouter = Router();

backupRouter.get('/', authMiddleware, requireAdmin, BackupController.getAll);
backupRouter.post('/create', authMiddleware, requireAdmin, BackupController.create);
backupRouter.post('/restore', authMiddleware, requireAdmin, BackupController.restore);
