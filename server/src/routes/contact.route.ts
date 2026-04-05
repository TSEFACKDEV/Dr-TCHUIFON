import { Router } from 'express';
import {
  sendContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markMessageAsRead,
  markMessageAsUnread,
  deleteContactMessage,
  getContactStats,
} from '../controllers/contact.controller.js';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Route publique
router.post('/', sendContactMessage);

// Routes admin
router.get('/', authMiddleware, isAdmin, getAllContactMessages);
router.get('/stats', authMiddleware, isAdmin, getContactStats);
router.get('/:id', authMiddleware, isAdmin, getContactMessageById);
router.patch('/:id/read', authMiddleware, isAdmin, markMessageAsRead);
router.patch('/:id/unread', authMiddleware, isAdmin, markMessageAsUnread);
router.delete('/:id', authMiddleware, isAdmin, deleteContactMessage);

export default router;
