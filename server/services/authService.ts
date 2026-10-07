import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Database } from 'better-sqlite3';
import { getDb, logAudit } from '../db/database';
import { User, Role } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'mangalore-store-pos-local-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  name: string;
  role: Role;
}

export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, 10);
}

export function verifyPin(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash);
}

export function generateToken(user: { id: string; name: string; role: Role }): string {
  return jwt.sign(
    { userId: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function createUser(
  db: Database,
  data: { name: string; role: Role; pin: string; adminUserId?: string }
): User {
  const id = crypto.randomUUID();
  const pinHash = hashPin(data.pin);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, name, role, pin_hash, is_active, failed_attempts, created_at)
    VALUES (?, ?, ?, ?, 1, 0, ?)
  `);

  stmt.run(id, data.name, data.role, pinHash, now);

  if (data.adminUserId) {
    logAudit(db, {
      userId: data.adminUserId,
      actingRole: 'admin',
      action: 'USER_CREATED',
      entityType: 'users',
      entityId: id,
      newValue: { name: data.name, role: data.role },
      severity: 'notice',
    });
  }

  return {
    id,
    name: data.name,
    role: data.role,
    is_active: 1,
    failed_attempts: 0,
    locked_until: null,
    created_at: now,
  };
}

export function authenticateUser(
  db: Database,
  userId: string,
  pin: string,
  deviceInfo?: string
): { success: boolean; user?: User; token?: string; error?: string; lockedRemainingSeconds?: number } {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user || user.is_active !== 1) {
    return { success: false, error: 'User not found or deactivated' };
  }

  // Check if currently locked
  const now = new Date();
  if (user.locked_until) {
    const lockedUntilDate = new Date(user.locked_until);
    if (lockedUntilDate > now) {
      const remainingSeconds = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / 1000);
      return {
        success: false,
        error: `Account temporarily locked due to failed attempts. Try again in ${remainingSeconds} seconds.`,
        lockedRemainingSeconds: remainingSeconds,
      };
    } else {
      // Lock expired, reset failed attempts
      db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      user.failed_attempts = 0;
      user.locked_until = null;
    }
  }

  const isMatch = verifyPin(pin, user.pin_hash);

  if (!isMatch) {
    const newFailed = user.failed_attempts + 1;
    let lockedUntil: string | null = null;
    let errorMsg = 'Incorrect PIN';

    if (newFailed >= 5) {
      // Lock for 5 minutes (300 seconds)
      const lockExpiry = new Date(now.getTime() + 5 * 60 * 1000);
      lockedUntil = lockExpiry.toISOString();
      errorMsg = 'Too many failed attempts. Account locked for 5 minutes.';
    }

    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(
      newFailed,
      lockedUntil,
      user.id
    );

    logAudit(db, {
      userId: user.id,
      actingRole: user.role,
      action: 'LOGIN_FAILED',
      entityType: 'users',
      entityId: user.id,
      reason: `Failed attempt #${newFailed}`,
      severity: newFailed >= 5 ? 'warning' : 'notice',
      deviceInfo,
    });

    return {
      success: false,
      error: errorMsg,
      lockedRemainingSeconds: lockedUntil ? 300 : undefined,
    };
  }

  // Successful login -> Reset failed attempts
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

  logAudit(db, {
    userId: user.id,
    actingRole: user.role,
    action: 'LOGIN_SUCCESS',
    entityType: 'users',
    entityId: user.id,
    severity: 'info',
    deviceInfo,
  });

  const token = generateToken({ id: user.id, name: user.name, role: user.role });

  const safeUser: User = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    failed_attempts: 0,
    locked_until: null,
    created_at: user.created_at,
  };

  return { success: true, user: safeUser, token };
}

// In-line Admin PIN Approval for Cashier Actions
export function verifyAdminPin(
  db: Database,
  adminPin: string,
  requestingUserId: string,
  actionDescription: string
): { success: boolean; adminUser?: User; error?: string } {
  // Find any active admin whose PIN matches
  const admins = db.prepare("SELECT * FROM users WHERE role = 'admin' AND is_active = 1").all() as any[];

  for (const admin of admins) {
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      continue;
    }
    if (verifyPin(adminPin, admin.pin_hash)) {
      logAudit(db, {
        userId: requestingUserId,
        actingRole: 'cashier',
        action: 'ADMIN_PIN_APPROVAL_GRANTED',
        entityType: 'approval',
        approvedBy: admin.id,
        reason: actionDescription,
        severity: 'notice',
      });
      return {
        success: true,
        adminUser: {
          id: admin.id,
          name: admin.name,
          role: admin.role,
          is_active: admin.is_active,
          failed_attempts: 0,
          locked_until: null,
          created_at: admin.created_at,
        },
      };
    }
  }

  logAudit(db, {
    userId: requestingUserId,
    actingRole: 'cashier',
    action: 'ADMIN_PIN_APPROVAL_FAILED',
    entityType: 'approval',
    reason: `Failed admin approval for: ${actionDescription}`,
    severity: 'warning',
  });

  return { success: false, error: 'Invalid Admin PIN or admin account locked' };
}

export function updateUserName(db: Database, userId: string, newName: string): User {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Name cannot be empty.');
  }
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(trimmed, userId);
  const updated = db.prepare('SELECT id, name, role, is_active, failed_attempts, locked_until, created_at FROM users WHERE id = ?').get(userId) as User;
  if (!updated) {
    throw new Error('User not found.');
  }
  return updated;
}

// Strip Confidential Financial Fields for Cashiers
export function sanitizeProductForCashier<T extends Record<string, any>>(product: T): T {
  const copy: any = { ...product };
  delete copy.purchase_price;
  delete copy.margin_percent;
  delete copy.stock_valuation;
  // Cashiers see qualitative stock indicator
  if ('current_stock' in copy) {
    const stock = Number(copy.current_stock);
    if (stock <= 0) {
      copy.stock_status = 'out_of_stock';
    } else if (stock <= (copy.min_stock || 5)) {
      copy.stock_status = 'low_stock';
    } else {
      copy.stock_status = 'in_stock';
    }
  }
  return copy as T;
}
