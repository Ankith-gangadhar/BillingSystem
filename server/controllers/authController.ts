import { Request, Response } from 'express';
import { getDb, logAudit } from '../db/database';
import { authenticateUser, createUser, verifyAdminPin } from '../services/authService';
import { userRepo } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AuthController {
  static isOwnerAtCounter: boolean = false;
  static ownerPresenceTimeout: NodeJS.Timeout | null = null;

  static async getUsers(_req: Request, res: Response): Promise<void> {
    const users = userRepo.findActiveUsers();
    res.json({ users });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const db = getDb();
    const { userId, pin, deviceInfo } = req.body;

    if (!userId || !pin) {
      res.status(400).json({ error: 'User ID and PIN are required.' });
      return;
    }

    const result = authenticateUser(db, userId, pin, deviceInfo);
    if (!result.success) {
      res.status(401).json({ error: result.error, lockedRemainingSeconds: result.lockedRemainingSeconds });
      return;
    }

    res.json({ user: result.user, token: result.token });
  }

  static async verifyAdminPin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const { adminPin, actionDescription } = req.body;

    if (!adminPin) {
      res.status(400).json({ error: 'Admin PIN is required.' });
      return;
    }

    const result = verifyAdminPin(db, adminPin, req.user!.userId, actionDescription || 'Admin Approval');
    if (!result.success) {
      res.status(403).json({ error: result.error });
      return;
    }

    res.json({ success: true, adminUser: result.adminUser });
  }

  static async getOwnerPresence(_req: Request, res: Response): Promise<void> {
    res.json({ isOwnerAtCounter: AuthController.isOwnerAtCounter });
  }

  static async toggleOwnerPresence(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const { enabled, adminPin, timeoutMinutes } = req.body;

    if (enabled) {
      if (req.user!.role !== 'admin') {
        if (!adminPin) {
          res.status(400).json({ error: 'Admin PIN required to enable Owner-at-Counter mode.' });
          return;
        }
        const verify = verifyAdminPin(db, adminPin, req.user!.userId, 'Enable Owner-at-Counter');
        if (!verify.success) {
          res.status(403).json({ error: 'Invalid Admin PIN.' });
          return;
        }
      }

      AuthController.isOwnerAtCounter = true;
      if (AuthController.ownerPresenceTimeout) clearTimeout(AuthController.ownerPresenceTimeout);

      const minutes = timeoutMinutes || 60;
      AuthController.ownerPresenceTimeout = setTimeout(() => {
        AuthController.isOwnerAtCounter = false;
      }, minutes * 60 * 1000);

      logAudit(db, {
        userId: req.user!.userId,
        actingRole: 'admin',
        action: 'OWNER_PRESENCE_ENABLED',
        entityType: 'presence',
        reason: `Owner presence enabled for ${minutes} min`,
        severity: 'notice',
      });
    } else {
      AuthController.isOwnerAtCounter = false;
      if (AuthController.ownerPresenceTimeout) clearTimeout(AuthController.ownerPresenceTimeout);

      logAudit(db, {
        userId: req.user!.userId,
        actingRole: req.user!.role,
        action: 'OWNER_PRESENCE_DISABLED',
        entityType: 'presence',
        severity: 'info',
      });
    }

    res.json({ isOwnerAtCounter: AuthController.isOwnerAtCounter });
  }

  static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const { name, role, pin } = req.body;

    if (!name || !role || !pin) {
      res.status(400).json({ error: 'Name, role, and PIN are required.' });
      return;
    }

    try {
      const user = createUser(db, { name, role, pin, adminUserId: req.user!.userId });
      res.status(201).json({ user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
