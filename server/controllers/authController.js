"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const database_1 = require("../db/database");
const authService_1 = require("../services/authService");
const userRepository_1 = require("../repositories/userRepository");
class AuthController {
    static isOwnerAtCounter = false;
    static ownerPresenceTimeout = null;
    static async getUsers(_req, res) {
        const users = userRepository_1.userRepo.findActiveUsers();
        res.json({ users });
    }
    static async login(req, res) {
        const db = (0, database_1.getDb)();
        const { userId, pin, deviceInfo } = req.body;
        if (!userId || !pin) {
            res.status(400).json({ error: 'User ID and PIN are required.' });
            return;
        }
        const result = (0, authService_1.authenticateUser)(db, userId, pin, deviceInfo);
        if (!result.success) {
            res.status(401).json({ error: result.error, lockedRemainingSeconds: result.lockedRemainingSeconds });
            return;
        }
        res.json({ user: result.user, token: result.token });
    }
    static async verifyAdminPin(req, res) {
        const db = (0, database_1.getDb)();
        const { adminPin, actionDescription } = req.body;
        if (!adminPin) {
            res.status(400).json({ error: 'Admin PIN is required.' });
            return;
        }
        const result = (0, authService_1.verifyAdminPin)(db, adminPin, req.user.userId, actionDescription || 'Admin Approval');
        if (!result.success) {
            res.status(403).json({ error: result.error });
            return;
        }
        res.json({ success: true, adminUser: result.adminUser });
    }
    static async getOwnerPresence(_req, res) {
        res.json({ isOwnerAtCounter: AuthController.isOwnerAtCounter });
    }
    static async toggleOwnerPresence(req, res) {
        const db = (0, database_1.getDb)();
        const { enabled, adminPin, timeoutMinutes } = req.body;
        if (enabled) {
            if (req.user.role !== 'admin') {
                if (!adminPin) {
                    res.status(400).json({ error: 'Admin PIN required to enable Owner-at-Counter mode.' });
                    return;
                }
                const verify = (0, authService_1.verifyAdminPin)(db, adminPin, req.user.userId, 'Enable Owner-at-Counter');
                if (!verify.success) {
                    res.status(403).json({ error: 'Invalid Admin PIN.' });
                    return;
                }
            }
            AuthController.isOwnerAtCounter = true;
            if (AuthController.ownerPresenceTimeout)
                clearTimeout(AuthController.ownerPresenceTimeout);
            const minutes = timeoutMinutes || 60;
            AuthController.ownerPresenceTimeout = setTimeout(() => {
                AuthController.isOwnerAtCounter = false;
            }, minutes * 60 * 1000);
            (0, database_1.logAudit)(db, {
                userId: req.user.userId,
                actingRole: 'admin',
                action: 'OWNER_PRESENCE_ENABLED',
                entityType: 'presence',
                reason: `Owner presence enabled for ${minutes} min`,
                severity: 'notice',
            });
        }
        else {
            AuthController.isOwnerAtCounter = false;
            if (AuthController.ownerPresenceTimeout)
                clearTimeout(AuthController.ownerPresenceTimeout);
            (0, database_1.logAudit)(db, {
                userId: req.user.userId,
                actingRole: req.user.role,
                action: 'OWNER_PRESENCE_DISABLED',
                entityType: 'presence',
                severity: 'info',
            });
        }
        res.json({ isOwnerAtCounter: AuthController.isOwnerAtCounter });
    }
    static async createUser(req, res) {
        const db = (0, database_1.getDb)();
        const { name, role, pin } = req.body;
        if (!name || !role || !pin) {
            res.status(400).json({ error: 'Name, role, and PIN are required.' });
            return;
        }
        try {
            const user = (0, authService_1.createUser)(db, { name, role, pin, adminUserId: req.user.userId });
            res.status(201).json({ user });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async updateProfile(req, res) {
        const db = (0, database_1.getDb)();
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Name is required.' });
            return;
        }
        try {
            const { updateUserName } = await Promise.resolve().then(() => require('../services/authService'));
            const updatedUser = updateUserName(db, req.user.userId, name);
            res.json({ user: updatedUser });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}
exports.AuthController = AuthController;
