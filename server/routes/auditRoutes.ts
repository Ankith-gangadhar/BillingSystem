import { Router, Response } from 'express';
import { getDb, verifyAuditIntegrity } from '../db/database';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';

export const auditRouter = Router();

// Admin: List Audit Logs (Filterable by date, action, entity, user, severity)
auditRouter.get('/', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { startDate, endDate, userId, entityType, severity, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT 
      a.*,
      u.name as user_name,
      app.name as approved_by_name
    FROM audit_log a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN users app ON app.id = a.approved_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (startDate && endDate) {
    query += ' AND a.timestamp >= ? AND a.timestamp <= ?';
    params.push(startDate, endDate);
  }
  if (userId) {
    query += ' AND a.user_id = ?';
    params.push(userId);
  }
  if (entityType) {
    query += ' AND a.entity_type = ?';
    params.push(entityType);
  }
  if (severity) {
    query += ' AND a.severity = ?';
    params.push(severity);
  }
  if (search) {
    query += ' AND (a.action LIKE ? OR a.reason LIKE ? OR a.entity_id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const countQuery = 'SELECT count(*) as total FROM audit_log';
  const total = (db.prepare(countQuery).get() as any).total;

  const logs = db.prepare(query).all(...params);
  res.json({ total, logs });
});

// Admin: Verify Cryptographic SHA-256 Hash Chain Integrity
auditRouter.get('/verify-integrity', authMiddleware, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const result = verifyAuditIntegrity(db);
  res.json(result);
});
