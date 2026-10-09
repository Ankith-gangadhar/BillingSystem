"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const auditController_1 = require("../controllers/auditController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.get('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, auditController_1.AuditController.getAll);
exports.auditRouter.get('/verify-integrity', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, auditController_1.AuditController.verifyIntegrity);
