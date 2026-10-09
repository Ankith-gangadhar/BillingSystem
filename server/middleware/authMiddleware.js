"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAdmin = requireAdmin;
const authService_1 = require("../services/authService");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication token required.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    const payload = (0, authService_1.verifyToken)(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired session token.' });
        return;
    }
    req.user = payload;
    next();
}
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        return;
    }
    next();
}
