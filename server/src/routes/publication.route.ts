import { Router } from 'express';
import {
  getAllPublications,
  getPublicationBySlug,
  getPublicationById,
  getMyPublications,
  createPublication,
  updatePublication,
  deletePublication,
} from '../controllers/publication.controller.js';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';
import { uploadPdf } from '../helper/UploadFile.js';

const router = Router();

// Routes publiques
router.get('/', getAllPublications);
router.get('/slug/:slug', getPublicationBySlug);
router.get('/:id', getPublicationById);

// Routes protégées
router.get('/user/me', authMiddleware, getMyPublications);
router.post('/', authMiddleware, isAdmin, uploadPdf.single('pdf'), createPublication);
router.put('/:id', authMiddleware, isAdmin, uploadPdf.single('pdf'), updatePublication);
router.delete('/:id', authMiddleware, isAdmin, deletePublication);

export default router;
