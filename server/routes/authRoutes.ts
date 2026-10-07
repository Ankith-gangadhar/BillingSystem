import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.get('/users', AuthController.getUsers);
authRouter.post('/login', AuthController.login);
authRouter.post('/verify-admin-pin', authMiddleware, AuthController.verifyAdminPin);
authRouter.get('/owner-presence', AuthController.getOwnerPresence);
authRouter.post('/owner-presence', authMiddleware, AuthController.toggleOwnerPresence);
authRouter.put('/profile', authMiddleware, AuthController.updateProfile);
authRouter.post('/users', authMiddleware, requireAdmin, AuthController.createUser);
