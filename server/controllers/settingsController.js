"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const database_1 = require("../db/database");
class SettingsController {
    // Get Current Settings (Public for POS defaults & configuration)
    static getSettings(_req, res) {
        const db = (0, database_1.getDb)();
        const settings = (0, database_1.getSettings)(db);
        res.json({ settings });
    }
    // Admin: Update Settings
    static updateSettings(req, res) {
        const db = (0, database_1.getDb)();
        const existing = (0, database_1.getSettings)(db);
        const updated = (0, database_1.updateSettings)(req.body, db);
        (0, database_1.logAudit)(db, {
            userId: req.user.userId,
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
exports.SettingsController = SettingsController;
