import { Router } from 'express';
import {
  getAllSupervisions,
  getSupervisionById,
  getMySupervisions,
  createSupervision,
  updateSupervision,
  deleteSupervision,
} from '../controllers/supervision.controller.js';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Routes publiques
router.get('/', getAllSupervisions);
router.get('/user/me', authMiddleware, getMySupervisions);
router.get('/:id', getSupervisionById);

// Routes protégées
router.post('/', authMiddleware, isAdmin, createSupervision);
router.put('/:id', authMiddleware, isAdmin, updateSupervision);
router.delete('/:id', authMiddleware, isAdmin, deleteSupervision);

export default router;
