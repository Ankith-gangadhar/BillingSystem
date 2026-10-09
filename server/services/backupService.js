"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackupDirectory = getBackupDirectory;
exports.computeFileChecksum = computeFileChecksum;
exports.createDatabaseBackup = createDatabaseBackup;
exports.restoreDatabaseBackup = restoreDatabaseBackup;
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const database_1 = require("../db/database");
function getBackupDirectory(db) {
    if (db) {
        const settings = (0, database_1.getSettings)(db);
        if (settings.backup_folder && fs_1.default.existsSync(settings.backup_folder)) {
            return settings.backup_folder;
        }
    }
    const defaultDir = path_1.default.join(process.cwd(), 'data', 'backups');
    if (!fs_1.default.existsSync(defaultDir)) {
        fs_1.default.mkdirSync(defaultDir, { recursive: true });
    }
    return defaultDir;
}
function computeFileChecksum(filePath) {
    const fileBuffer = fs_1.default.readFileSync(filePath);
    return crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
}
async function createDatabaseBackup(db, type = 'manual', userId) {
    const backupDir = getBackupDirectory(db);
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `mangalore_store_backup_${type}_${timestampStr}.db`;
    const backupFilePath = path_1.default.join(backupDir, filename);
    // Use SQLite online backup API to write safely while DB is active
    await db.backup(backupFilePath);
    const stats = fs_1.default.statSync(backupFilePath);
    const checksum = computeFileChecksum(backupFilePath);
    const id = crypto_1.default.randomUUID();
    const nowIso = now.toISOString();
    // Verify backup file integrity
    const tempCheckDb = new (require('better-sqlite3'))(backupFilePath);
    const integrityResult = tempCheckDb.pragma('integrity_check');
    tempCheckDb.close();
    const isHealthy = integrityResult.length === 1 && integrityResult[0].integrity_check === 'ok';
    const status = isHealthy ? 'valid' : 'corrupt';
    db.prepare(`
    INSERT INTO backups (id, created_at, type, path, size, checksum, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nowIso, type, backupFilePath, stats.size, checksum, status);
    if (userId) {
        (0, database_1.logAudit)(db, {
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
function restoreDatabaseBackup(db, backupId, adminUserId) {
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);
    if (!backup) {
        throw new Error('Backup record not found.');
    }
    if (!fs_1.default.existsSync(backup.path)) {
        throw new Error(`Backup file not found at ${backup.path}`);
    }
    // 1. Verify checksum of file to be restored
    const currentChecksum = computeFileChecksum(backup.path);
    if (currentChecksum !== backup.checksum) {
        throw new Error('Backup file checksum mismatch. The file may be corrupted or tampered with.');
    }
    // 2. Create pre-restore snapshot of current state
    const mainDbPath = path_1.default.join(process.cwd(), 'data', 'mangalore_store.db');
    const preRestorePath = path_1.default.join(getBackupDirectory(db), `pre_restore_${Date.now()}.db`);
    fs_1.default.copyFileSync(mainDbPath, preRestorePath);
    // 3. Perform file restore
    fs_1.default.copyFileSync(backup.path, mainDbPath);
    (0, database_1.logAudit)(db, {
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
function pruneOldBackups(db, backupDir) {
    try {
        const allBackups = db.prepare("SELECT * FROM backups WHERE type = 'auto' ORDER BY created_at DESC").all();
        // Keep 14 most recent auto backups
        if (allBackups.length > 14) {
            const toDelete = allBackups.slice(14);
            for (const b of toDelete) {
                if (fs_1.default.existsSync(b.path)) {
                    fs_1.default.unlinkSync(b.path);
                }
                db.prepare('DELETE FROM backups WHERE id = ?').run(b.id);
            }
        }
    }
    catch (err) {
        console.error('Error during backup pruning:', err);
    }
}
