import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { AuditLogEntry } from '../../shared/types';

export class AuditRepository {
  constructor(private db: Database = getDb()) {}

  insertEntry(entry: any): void {
    this.db.prepare(`
      INSERT INTO audit_log (
        id, timestamp, user_id, acting_role, action, entity_type, entity_id,
        old_value, new_value, reason, approved_by, severity, device_info, prev_hash, hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.timestamp,
      entry.user_id,
      entry.acting_role,
      entry.action,
      entry.entity_type,
      entry.entity_id || null,
      entry.old_value || null,
      entry.new_value || null,
      entry.reason || null,
      entry.approved_by || null,
      entry.severity,
      entry.device_info || null,
      entry.prev_hash,
      entry.hash
    );
  }

  getLastHash(): string {
    const row = this.db.prepare('SELECT hash FROM audit_log ORDER BY rowid DESC LIMIT 1').get() as { hash: string } | undefined;
    return row ? row.hash : 'GENESIS';
  }

  findAllOrdered(): any[] {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY rowid ASC').all();
  }
}

export const auditRepo = new AuditRepository();
