import { Router, Response } from 'express';
import { getDb, getSettings, updateSettings, logAudit } from '../db/database';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';

export const settingsRouter = Router();

// Get Current Settings (Public for POS defaults & configuration)
settingsRouter.get('/', authMiddleware, (_req, res: Response) => {
  const db = getDb();
  const settings = getSettings(db);
  res.json({ settings });
});

// Admin: Update Settings
settingsRouter.put('/', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const existing = getSettings(db);
  const updated = updateSettings(req.body, db);

  logAudit(db, {
    userId: req.user!.userId,
    actingRole: 'admin',
    action: 'SETTINGS_UPDATED',
    entityType: 'settings',
    oldValue: existing,
    newValue: req.body,
    severity: 'notice',
  });

  res.json({ settings: updated });
});
