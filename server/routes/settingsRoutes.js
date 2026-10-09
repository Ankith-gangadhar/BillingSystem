"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.settingsRouter = (0, express_1.Router)();
exports.settingsRouter.get('/', authMiddleware_1.authMiddleware, settingsController_1.SettingsController.getSettings);
exports.settingsRouter.put('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, settingsController_1.SettingsController.updateSettings);
