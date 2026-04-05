import { Router } from 'express';
import {
  getPublicProfile,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from '../controllers/profile.controller.js';
import { authMiddleware, isAdmin } from '../middleware/auth.middleware.js';
import { uploadProfile } from '../helper/UploadFile.js';

const router = Router();

// Routes publiques
router.get('/public', getPublicProfile);

// Routes protégées
router.get('/me', authMiddleware, getMyProfile);
router.post(
  '/', 
  authMiddleware, 
  isAdmin, 
  uploadProfile.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ]), 
  createProfile
);
router.put(
  '/', 
  authMiddleware, 
  isAdmin, 
  uploadProfile.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ]), 
  updateProfile
);
router.delete('/', authMiddleware, isAdmin, deleteProfile);

export default router;
