import { Response } from 'express';
import { getDb, getSettings, updateSettings, logAudit } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class SettingsController {
  // Get Current Settings (Public for POS defaults & configuration)
  static getSettings(_req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const settings = getSettings(db);
    res.json({ settings });
  }

  // Admin: Update Settings
  static updateSettings(req: AuthenticatedRequest, res: Response): void {
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
  }
}
