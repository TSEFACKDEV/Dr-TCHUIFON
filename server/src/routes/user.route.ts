import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  getUserProfile,
  deleteUser,
  getUsersStats,
  searchUsers,
} from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const userRouter = Router();

// Public routes
userRouter.get('/', getAllUsers);
userRouter.get('/search', searchUsers);
userRouter.get('/stats', getUsersStats);
userRouter.get('/profile/me', authMiddleware, getUserProfile);
userRouter.get('/:id', getUserById);

// Protected routes - Authentication required

// Admin routes
userRouter.delete('/:id', authMiddleware, deleteUser);

export default userRouter;
