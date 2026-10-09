"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnRouter = void 0;
const express_1 = require("express");
const returnController_1 = require("../controllers/returnController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.returnRouter = (0, express_1.Router)();
exports.returnRouter.post('/', authMiddleware_1.authMiddleware, returnController_1.ReturnController.processReturn);
exports.returnRouter.get('/', authMiddleware_1.authMiddleware, returnController_1.ReturnController.getAll);
