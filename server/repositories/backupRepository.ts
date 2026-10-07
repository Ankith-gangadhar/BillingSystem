import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { BackupRecord } from '../../shared/types';

export class BackupRepository {
  constructor(private db: Database = getDb()) {}

  create(backup: BackupRecord): void {
    this.db.prepare(`
      INSERT INTO backups (id, created_at, type, path, size, checksum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(backup.id, backup.created_at, backup.type, backup.path, backup.size, backup.checksum, backup.status);
  }

  findAll(): BackupRecord[] {
    return this.db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all() as BackupRecord[];
  }

  findById(id: string): BackupRecord | undefined {
    return this.db.prepare('SELECT * FROM backups WHERE id = ?').get(id) as BackupRecord | undefined;
  }
}

export const backupRepo = new BackupRepository();
