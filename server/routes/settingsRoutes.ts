import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const settingsRouter = Router();

settingsRouter.get('/', authMiddleware, SettingsController.getSettings);
settingsRouter.put('/', authMiddleware, requireAdmin, SettingsController.updateSettings);
