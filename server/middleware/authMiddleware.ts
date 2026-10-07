import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload, sanitizeProductForCashier } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  req.user = payload;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
}
