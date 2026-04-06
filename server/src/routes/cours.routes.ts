import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  getCoursesByUser,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
  getCoursesByLevel,
} from '../controllers/cours.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { uploadImage, handleMulterError } from '../helper/UploadFile.js';

const coursRouter = Router();

// Public routes
coursRouter.get('/', getAllCourses);
coursRouter.get('/search', searchCourses);
coursRouter.get('/level/:level', getCoursesByLevel);
coursRouter.get('/user/courses', authMiddleware, getCoursesByUser);
coursRouter.get('/:id', getCourseById);

// Protected routes - Authentication required

// Create course with image upload
coursRouter.post(
  '/',
  authMiddleware,
  uploadImage.single('image'),
  handleMulterError,
  createCourse
);

// Update course with optional image upload
coursRouter.put(
  '/:id',
  authMiddleware,
  uploadImage.single('image'),
  handleMulterError,
  updateCourse
);

// Delete course
coursRouter.delete('/:id', authMiddleware, deleteCourse);

export default coursRouter;
