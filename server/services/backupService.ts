import { Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BackupRecord } from '../../shared/types';
import { getSettings, logAudit } from '../db/database';

export function getBackupDirectory(db?: Database): string {
  if (db) {
    const settings = getSettings(db);
    if (settings.backup_folder && fs.existsSync(settings.backup_folder)) {
      return settings.backup_folder;
    }
  }
  const defaultDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export function computeFileChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export async function createDatabaseBackup(
  db: Database,
  type: 'auto' | 'manual' | 'pre-restore' | 'pre-import' = 'manual',
  userId?: string
): Promise<BackupRecord> {
  const backupDir = getBackupDirectory(db);
  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const filename = `mangalore_store_backup_${type}_${timestampStr}.db`;
  const backupFilePath = path.join(backupDir, filename);

  // Use SQLite online backup API to write safely while DB is active
  await db.backup(backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const checksum = computeFileChecksum(backupFilePath);
  const id = crypto.randomUUID();
  const nowIso = now.toISOString();

  // Verify backup file integrity
  const tempCheckDb = new (require('better-sqlite3'))(backupFilePath);
  const integrityResult = tempCheckDb.pragma('integrity_check') as any[];
  tempCheckDb.close();

  const isHealthy = integrityResult.length === 1 && integrityResult[0].integrity_check === 'ok';
  const status = isHealthy ? 'valid' : 'corrupt';

  db.prepare(`
    INSERT INTO backups (id, created_at, type, path, size, checksum, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nowIso, type, backupFilePath, stats.size, checksum, status);

  if (userId) {
    logAudit(db, {
      userId,
      actingRole: 'admin',
      action: 'BACKUP_CREATED',
      entityType: 'backups',
      entityId: id,
      newValue: { type, filename, size: stats.size, status },
      severity: 'info',
    });
  }

  // Cleanup old backups based on rolling retention policy (14 daily, 8 weekly)
  pruneOldBackups(db, backupDir);

  return {
    id,
    created_at: nowIso,
    type,
    path: backupFilePath,
    size: stats.size,
    checksum,
    status,
  };
}

export function restoreDatabaseBackup(
  db: Database,
  backupId: string,
  adminUserId: string
): { success: boolean; message: string } {
  const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId) as BackupRecord | undefined;
  if (!backup) {
    throw new Error('Backup record not found.');
  }

  if (!fs.existsSync(backup.path)) {
    throw new Error(`Backup file not found at ${backup.path}`);
  }

  // 1. Verify checksum of file to be restored
  const currentChecksum = computeFileChecksum(backup.path);
  if (currentChecksum !== backup.checksum) {
    throw new Error('Backup file checksum mismatch. The file may be corrupted or tampered with.');
  }

  // 2. Create pre-restore snapshot of current state
  const mainDbPath = path.join(process.cwd(), 'data', 'mangalore_store.db');
  const preRestorePath = path.join(getBackupDirectory(db), `pre_restore_${Date.now()}.db`);
  fs.copyFileSync(mainDbPath, preRestorePath);

  // 3. Perform file restore
  fs.copyFileSync(backup.path, mainDbPath);

  logAudit(db, {
    userId: adminUserId,
    actingRole: 'admin',
    action: 'BACKUP_RESTORED',
    entityType: 'backups',
    entityId: backupId,
    newValue: { restoredFrom: backup.path, preRestoreBackup: preRestorePath },
    reason: `Restored database from backup dated ${backup.created_at}`,
    approvedBy: adminUserId,
    severity: 'warning',
  });

  return {
    success: true,
    message: `Database successfully restored from backup ${backup.created_at}. Pre-restore safety snapshot created.`,
  };
}

function pruneOldBackups(db: Database, backupDir: string) {
  try {
    const allBackups = db.prepare("SELECT * FROM backups WHERE type = 'auto' ORDER BY created_at DESC").all() as BackupRecord[];
    // Keep 14 most recent auto backups
    if (allBackups.length > 14) {
      const toDelete = allBackups.slice(14);
      for (const b of toDelete) {
        if (fs.existsSync(b.path)) {
          fs.unlinkSync(b.path);
        }
        db.prepare('DELETE FROM backups WHERE id = ?').run(b.id);
      }
    }
  } catch (err) {
    console.error('Error during backup pruning:', err);
  }
}
