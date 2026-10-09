"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseRouter = void 0;
const express_1 = require("express");
const purchaseController_1 = require("../controllers/purchaseController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.purchaseRouter = (0, express_1.Router)();
exports.purchaseRouter.post('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, purchaseController_1.PurchaseController.receive);
exports.purchaseRouter.get('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, purchaseController_1.PurchaseController.getAll);
