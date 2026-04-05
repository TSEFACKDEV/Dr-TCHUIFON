import { Router } from 'express';
import {
  Register,
  Login,
  Logout,
  GetProfile,
  ChangePassword,
  forgotPassword,
  resetPassword,
  RefreshToken,
} from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const authRouter = Router();

// Public routes
authRouter.post('/register', Register);
authRouter.post('/login', Login);
authRouter.post('/refresh-token', RefreshToken);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// Protected routes
authRouter.get('/profile', authMiddleware, GetProfile);
authRouter.put('/change-password', authMiddleware, ChangePassword);
authRouter.post('/logout', authMiddleware, Logout);

export default authRouter;
