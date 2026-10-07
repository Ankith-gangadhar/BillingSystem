import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const auditRouter = Router();

auditRouter.get('/', authMiddleware, requireAdmin, AuditController.getAll);
auditRouter.get('/verify-integrity', authMiddleware, requireAdmin, AuditController.verifyIntegrity);
