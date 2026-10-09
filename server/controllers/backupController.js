"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const database_1 = require("../db/database");
const backupService_1 = require("../services/backupService");
const authService_1 = require("../services/authService");
class BackupController {
    // Admin: List Backups
    static getAll(_req, res) {
        const db = (0, database_1.getDb)();
        const backups = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
        res.json({ backups });
    }
    // Admin: Trigger Manual Backup Now
    static async create(req, res) {
        const db = (0, database_1.getDb)();
        try {
            const backup = await (0, backupService_1.createDatabaseBackup)(db, 'manual', req.user.userId);
            res.status(201).json({ backup });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Admin: Restore from Backup (Requires Admin PIN)
    static restore(req, res) {
        const db = (0, database_1.getDb)();
        const { backupId, adminPin } = req.body;
        if (!backupId || !adminPin) {
            res.status(400).json({ error: 'Backup ID and Admin PIN are required to perform a database restore.' });
            return;
        }
        const verify = (0, authService_1.verifyAdminPin)(db, adminPin, req.user.userId, `Restore database backup ID ${backupId}`);
        if (!verify.success) {
            res.status(403).json({ error: 'Invalid Admin PIN.' });
            return;
        }
        try {
            const result = (0, backupService_1.restoreDatabaseBackup)(db, backupId, req.user.userId);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.BackupController = BackupController;
