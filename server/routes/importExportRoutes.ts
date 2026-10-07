import { Router } from 'express';
import multer from 'multer';
import { ImportExportController } from '../controllers/importExportController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const importExportRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

importExportRouter.get('/template', ImportExportController.getTemplate);
importExportRouter.post('/preview', authMiddleware, requireAdmin, upload.single('file'), ImportExportController.preview);
importExportRouter.post('/execute', authMiddleware, requireAdmin, ImportExportController.execute);
importExportRouter.get('/export/:type', authMiddleware, requireAdmin, ImportExportController.exportData);
