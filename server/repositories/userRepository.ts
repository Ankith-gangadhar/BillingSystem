import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { User, Role } from '../../shared/types';

export class UserRepository {
  constructor(private db: Database = getDb()) {}

  findById(id: string): User | undefined {
    return this.db.prepare('SELECT id, name, role, is_active, failed_attempts, locked_until, created_at FROM users WHERE id = ?').get(id) as User | undefined;
  }

  findByIdWithHash(id: string): any {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  findActiveUsers(): User[] {
    return this.db.prepare('SELECT id, name, role, is_active, failed_attempts, locked_until, created_at FROM users WHERE is_active = 1 ORDER BY name ASC').all() as User[];
  }

  findActiveAdmins(): any[] {
    return this.db.prepare("SELECT * FROM users WHERE role = 'admin' AND is_active = 1").all();
  }

  create(user: { id: string; name: string; role: Role; pin_hash: string; created_at: string }): void {
    this.db.prepare(`
      INSERT INTO users (id, name, role, pin_hash, is_active, failed_attempts, created_at)
      VALUES (?, ?, ?, ?, 1, 0, ?)
    `).run(user.id, user.name, user.role, user.pin_hash, user.created_at);
  }

  updateLockStatus(id: string, failedAttempts: number, lockedUntil: string | null): void {
    this.db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(failedAttempts, lockedUntil, id);
  }

  resetLockout(id: string): void {
    this.db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(id);
  }
}

export const userRepo = new UserRepository();
