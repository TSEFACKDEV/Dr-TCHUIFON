import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import { deleteUploadedFile, getFileInfo } from '../helper/UploadFile.js';

// Validation Schemas - Tous les champs sont optionnels
const createCourseSchema = yup.object().shape({
  title: yup.string().optional().nullable().min(5, 'Le titre doit avoir au moins 5 caractères'),
  description: yup.string().optional().nullable().min(10, 'La description doit avoir au moins 10 caractères'),
  level: yup.string().optional().nullable().oneOf(['LICENCE', 'MASTER', 'INGENIEUR', 'DOCTORAT'], 'Le niveau doit être valide'),
  code: yup.string().optional().nullable(),
  semester: yup.string().optional().nullable(),
  hours: yup.number().optional().nullable().positive('Les heures doivent être positives'),
  credits: yup.number().optional().nullable().positive('Les crédits doivent être positifs'),
  syllabus: yup.string().optional().nullable().min(10, 'Le syllabus doit avoir au moins 10 caractères'),
  objectives: yup.array().optional().nullable().of(yup.string()),
});

const updateCourseSchema = yup.object().shape({
  title: yup.string().optional().nullable().min(5, 'Le titre doit avoir au moins 5 caractères'),
  description: yup.string().optional().nullable().min(10, 'La description doit avoir au moins 10 caractères'),
  level: yup.string().optional().nullable().oneOf(['LICENCE', 'MASTER', 'INGENIEUR', 'DOCTORAT'], 'Le niveau doit être valide'),
  code: yup.string().optional().nullable(),
  semester: yup.string().optional().nullable(),
  hours: yup.number().optional().nullable().positive('Les heures doivent être positives'),
  credits: yup.number().optional().nullable().positive('Les crédits doivent être positifs'),
  syllabus: yup.string().optional().nullable().min(10, 'Le syllabus doit avoir au moins 10 caractères'),
  objectives: yup.array().optional().nullable().of(yup.string()),
});

/**
 * Récupère tous les cours
 */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 0, level, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    const where: any = {};

    if (level) {
      where.level = level as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.course.count({ where });

    return ResponseApi.success(res, 'Cours récupérés avec succès', {
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des cours', error.message);
  }
};

/**
 * Récupère un cours par ID
 */
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du cours est requis', {}, 400);
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                title: true,
                photoUrl: true,
                institution: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return ResponseApi.notFound(res, 'Cours non trouvé');
    }

    return ResponseApi.success(res, 'Cours récupéré avec succès', course);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du cours', error.message);
  }
};

/**
 * Récupère les cours d'un utilisateur
 */
export const getCoursesByUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 0 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.course.count({ where: { userId } });

    return ResponseApi.success(res, 'Cours récupérés avec succès', {
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des cours', error.message);
  }
};

/**
 * Crée un nouveau cours
 */
export const createCourse = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, description, level, code, semester, hours, credits, syllabus, objectives } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Parse objectives if string
    const parsedObjectives = typeof objectives === 'string' ? JSON.parse(objectives) : objectives || [];

    // Validation
    await createCourseSchema.validate({
      title,
      description,
      level,
      code,
      semester,
      hours,
      credits,
      syllabus,
      objectives: parsedObjectives,
    });

    const course = await prisma.course.create({
      data: {
        title: title || null,
        description: description || null,
        level: level || null,
        code: code || null,
        semester: semester || null,
        hours: hours ? parseInt(hours as string) : null,
        credits: credits ? parseInt(credits as string) : null,
        syllabus: syllabus || null,
        objectives: parsedObjectives || [],
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    return ResponseApi.success(res, 'Cours créé avec succès', course, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la création du cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la création du cours', error.message);
  }
};

/**
 * Met à jour un cours
 */
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, description, level, code, semester, hours, credits, syllabus, objectives } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du cours est requis', {}, 400);
    }

    // Récupère le cours actuel
    const currentCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!currentCourse) {
      return ResponseApi.notFound(res, 'Cours non trouvé');
    }

    // Vérifie que l'utilisateur est le propriétaire
    if (currentCourse.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Parse objectives if string
    const parsedObjectives = objectives ? (typeof objectives === 'string' ? JSON.parse(objectives) : objectives) : undefined;

    // Validation
    await updateCourseSchema.validate({
      title,
      description,
      level,
      code,
      semester,
      hours,
      credits,
      syllabus,
      objectives: parsedObjectives,
    });

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (level !== undefined) updateData.level = level;
    if (code !== undefined) updateData.code = code || null;
    if (semester !== undefined) updateData.semester = semester || null;
    if (hours !== undefined) updateData.hours = hours ? parseInt(hours as string) : null;
    if (credits !== undefined) updateData.credits = credits ? parseInt(credits as string) : null;
    if (syllabus !== undefined) updateData.syllabus = syllabus || null;
    if (parsedObjectives !== undefined) updateData.objectives = parsedObjectives;

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    return ResponseApi.success(res, 'Cours mis à jour avec succès', course);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la mise à jour du cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour du cours', error.message);
  }
};

/**
 * Supprime un cours
 */
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du cours est requis', {}, 400);
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return ResponseApi.notFound(res, 'Cours non trouvé');
    }

    // Vérifie que l'utilisateur est le propriétaire
    if (course.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Supprime le cours
    await prisma.course.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Cours supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression du cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression du cours', error.message);
  }
};

/**
 * Recherche les cours
 */
export const searchCourses = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 0, level } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    if (!q) {
      return ResponseApi.error(res, 'Le terme de recherche est requis', {}, 400);
    }

    const where: any = {
      OR: [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { syllabus: { contains: q as string, mode: 'insensitive' } },
      ],
    };

    if (level) {
      where.level = level as string;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.course.count({ where });

    return ResponseApi.success(res, 'Résultats de recherche', {
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la recherche:', error);
    return ResponseApi.error(res, 'Erreur lors de la recherche', error.message);
  }
};

/**
 * Récupère les cours par niveau
 */
export const getCoursesByLevel = async (req: Request, res: Response) => {
  try {
    const { level } = req.params;
    const { page = 1, limit = 0 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    const validLevels = ['LICENCE', 'MASTER', 'INGENIEUR', 'DOCTORAT'];

    if (!level || !validLevels.includes(level as string)) {
      return ResponseApi.error(res, 'Le niveau est invalide', {}, 400);
    }

    const courses = await prisma.course.findMany({
      where: { level: level as any },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.course.count({ where: { level: level as any } });

    return ResponseApi.success(res, 'Cours récupérés avec succès', {
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des cours:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des cours', error.message);
  }
};
