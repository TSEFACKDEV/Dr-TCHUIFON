import { Router } from 'express';
import {
  getAllCollaborators,
  getCollaboratorById,
  getMyCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  linkCollaboratorToPublication,
  unlinkCollaboratorFromPublication,
} from '../controllers/collaborator.controller.js';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';
import { uploadImage } from '../helper/UploadFile.js';

const router = Router();

// Routes publiques
router.get('/', getAllCollaborators);
router.get('/user/me', authMiddleware, getMyCollaborators);
router.get('/:id', getCollaboratorById);

// Routes protégées
router.post('/', authMiddleware, isAdmin, uploadImage.single('photo'), createCollaborator);
router.put('/:id', authMiddleware, isAdmin, uploadImage.single('photo'), updateCollaborator);
router.delete('/:id', authMiddleware, isAdmin, deleteCollaborator);

// Routes pour lier/délier collaborateurs et publications
router.post('/link', authMiddleware, isAdmin, linkCollaboratorToPublication);
router.delete('/unlink', authMiddleware, isAdmin, unlinkCollaboratorFromPublication);

export default router;
