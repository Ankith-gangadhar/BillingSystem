import { Response } from 'express';
import { getDb } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { createDatabaseBackup, restoreDatabaseBackup } from '../services/backupService';
import { verifyAdminPin } from '../services/authService';

export class BackupController {
  // Admin: List Backups
  static getAll(_req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    res.json({ backups });
  }

  // Admin: Trigger Manual Backup Now
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    try {
      const backup = await createDatabaseBackup(db, 'manual', req.user!.userId);
      res.status(201).json({ backup });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Admin: Restore from Backup (Requires Admin PIN)
  static restore(req: AuthenticatedRequest, res: Response): void {
    const db = getDb();
    const { backupId, adminPin } = req.body;

    if (!backupId || !adminPin) {
      res.status(400).json({ error: 'Backup ID and Admin PIN are required to perform a database restore.' });
      return;
    }

    const verify = verifyAdminPin(db, adminPin, req.user!.userId, `Restore database backup ID ${backupId}`);
    if (!verify.success) {
      res.status(403).json({ error: 'Invalid Admin PIN.' });
      return;
    }

    try {
      const result = restoreDatabaseBackup(db, backupId, req.user!.userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
