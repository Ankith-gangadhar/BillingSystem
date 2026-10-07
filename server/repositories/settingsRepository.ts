import { Database } from 'better-sqlite3';
import { getDb, DEFAULT_SETTINGS } from '../db/database';
import { Settings } from '../../shared/types';

export class SettingsRepository {
  constructor(private db: Database = getDb()) {}

  getAll(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settingsObj: any = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        settingsObj[row.key] = JSON.parse(row.value);
      } catch {
        settingsObj[row.key] = row.value;
      }
    }
    return settingsObj as Settings;
  }

  update(key: string, value: any): void {
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value));
  }
}

export const settingsRepo = new SettingsRepository();
