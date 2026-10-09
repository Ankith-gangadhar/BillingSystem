"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepo = exports.UserRepository = void 0;
const database_1 = require("../db/database");
class UserRepository {
    db;
    constructor(db = (0, database_1.getDb)()) {
        this.db = db;
    }
    findById(id) {
        return this.db.prepare('SELECT id, name, role, is_active, failed_attempts, locked_until, created_at FROM users WHERE id = ?').get(id);
    }
    findByIdWithHash(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    findActiveUsers() {
        return this.db.prepare('SELECT id, name, role, is_active, failed_attempts, locked_until, created_at FROM users WHERE is_active = 1 ORDER BY name ASC').all();
    }
    findActiveAdmins() {
        return this.db.prepare("SELECT * FROM users WHERE role = 'admin' AND is_active = 1").all();
    }
    create(user) {
        this.db.prepare(`
      INSERT INTO users (id, name, role, pin_hash, is_active, failed_attempts, created_at)
      VALUES (?, ?, ?, ?, 1, 0, ?)
    `).run(user.id, user.name, user.role, user.pin_hash, user.created_at);
    }
    updateLockStatus(id, failedAttempts, lockedUntil) {
        this.db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(failedAttempts, lockedUntil, id);
    }
    resetLockout(id) {
        this.db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(id);
    }
}
exports.UserRepository = UserRepository;
exports.userRepo = new UserRepository();
