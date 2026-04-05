import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';

// Validation Schemas - Tous les champs sont optionnels
const createSupervisionSchema = yup.object().shape({
  studentName: yup.string().optional().nullable().min(5, 'Le nom doit avoir au moins 5 caractères'),
  level: yup.string().optional().nullable().oneOf(['INGENIEUR', 'MASTER_2', 'DOCTORAT', 'POST_DOC'], 'Le niveau doit être valide'),
  topic: yup.string().optional().nullable().min(10, 'Le sujet doit avoir au moins 10 caractères'),
  description: yup.string().optional().nullable().min(10, 'La description doit avoir au moins 10 caractères'),
  startDate: yup.string().optional().nullable(),
  endDate: yup.string().optional().nullable(),
  status: yup.string().optional().nullable().oneOf(['IN_PROGRESS', 'COMPLETED', 'ABANDONED'], 'Le statut doit être valide'),
  thesisUrl: yup.string().optional().nullable().url('L\'URL doit être valide'),
  publications: yup.array().optional().nullable().of(yup.string()),
});

const updateSupervisionSchema = yup.object().shape({
  studentName: yup.string().optional().nullable().min(5, 'Le nom doit avoir au moins 5 caractères'),
  level: yup.string().optional().nullable().oneOf(['INGENIEUR', 'MASTER_2', 'DOCTORAT', 'POST_DOC'], 'Le niveau doit être valide'),
  topic: yup.string().optional().nullable().min(10, 'Le sujet doit avoir au moins 10 caractères'),
  description: yup.string().optional().nullable().min(10, 'La description doit avoir au moins 10 caractères'),
  startDate: yup.string().optional().nullable(),
  endDate: yup.string().optional().nullable(),
  status: yup.string().optional().nullable().oneOf(['IN_PROGRESS', 'COMPLETED', 'ABANDONED'], 'Le statut doit être valide'),
  thesisUrl: yup.string().optional().nullable().url('L\'URL doit être valide'),
  publications: yup.array().optional().nullable().of(yup.string()),
});

/**
 * Récupère tous les encadrements (publics)
 */
export const getAllSupervisions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 0, level, status } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    const where: any = {};

    if (level && ['INGENIEUR', 'MASTER_2', 'DOCTORAT', 'POST_DOC'].includes(level as string)) {
      where.level = level as string;
    }

    if (status && ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'].includes(status as string)) {
      where.status = status as string;
    }

    const supervisions = await prisma.supervision.findMany({
      where,
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
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.supervision.count({ where });

    return ResponseApi.success(res, 'Encadrements récupérés avec succès', {
      supervisions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des encadrements:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des encadrements', error.message);
  }
};

/**
 * Récupère un encadrement par ID
 */
export const getSupervisionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de l\'encadrement est requis', {}, 400);
    }

    const supervision = await prisma.supervision.findUnique({
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

    if (!supervision) {
      return ResponseApi.notFound(res, 'Encadrement non trouvé');
    }

    return ResponseApi.success(res, 'Encadrement récupéré avec succès', supervision);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'encadrement:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération de l\'encadrement', error.message);
  }
};

/**
 * Récupère les encadrements de l'utilisateur authentifié
 */
export const getMySupervisions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 0, status } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const where: any = { userId };

    if (status && ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'].includes(status as string)) {
      where.status = status as string;
    }

    const supervisions = await prisma.supervision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.supervision.count({ where });

    return ResponseApi.success(res, 'Encadrements récupérés avec succès', {
      supervisions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des encadrements:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des encadrements', error.message);
  }
};

/**
 * Crée un nouvel encadrement
 */
export const createSupervision = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      studentName,
      level,
      topic,
      description,
      startDate,
      endDate,
      status,
      thesisUrl,
      publications,
    } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Validation
    await createSupervisionSchema.validate({
      studentName,
      level,
      topic,
      description,
      startDate,
      endDate,
      status,
      thesisUrl,
      publications,
    });

    // Helper pour traiter les dates (accepte "unknown" ou null)
    const parseDate = (dateValue: any): Date | null => {
      if (!dateValue || dateValue === 'unknown') return null;
      try {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    const supervision = await prisma.supervision.create({
      data: {
        userId,
        studentName: studentName || null,
        level: level || null,
        topic: topic || null,
        description: description || null,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        status: status || 'IN_PROGRESS',
        thesisUrl: thesisUrl || null,
        publications: publications || [],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return ResponseApi.success(res, 'Encadrement créé avec succès', supervision, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la création de l\'encadrement:', error);
    return ResponseApi.error(res, 'Erreur lors de la création de l\'encadrement', error.message);
  }
};

/**
 * Met à jour un encadrement
 */
export const updateSupervision = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const {
      studentName,
      level,
      topic,
      description,
      startDate,
      endDate,
      status,
      thesisUrl,
      publications,
    } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de l\'encadrement est requis', {}, 400);
    }

    const existingSupervision = await prisma.supervision.findUnique({
      where: { id },
    });

    if (!existingSupervision) {
      return ResponseApi.notFound(res, 'Encadrement non trouvé');
    }

    if (existingSupervision.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Validation
    await updateSupervisionSchema.validate({
      studentName,
      level,
      topic,
      description,
      startDate,
      endDate,
      status,
      thesisUrl,
      publications,
    });

    // Helper pour traiter les dates (accepte "unknown" ou null)
    const parseDate = (dateValue: any): Date | null => {
      if (!dateValue || dateValue === 'unknown') return null;
      try {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    const supervision = await prisma.supervision.update({
      where: { id },
      data: {
        ...(studentName !== undefined && { studentName }),
        ...(level !== undefined && { level }),
        ...(topic !== undefined && { topic }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: parseDate(startDate) }),
        ...(endDate !== undefined && { endDate: parseDate(endDate) }),
        ...(status !== undefined && { status }),
        ...(thesisUrl !== undefined && { thesisUrl }),
        ...(publications !== undefined && { publications }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return ResponseApi.success(res, 'Encadrement mis à jour avec succès', supervision);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la mise à jour de l\'encadrement:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour de l\'encadrement', error.message);
  }
};

/**
 * Supprime un encadrement
 */
export const deleteSupervision = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de l\'encadrement est requis', {}, 400);
    }

    const supervision = await prisma.supervision.findUnique({
      where: { id },
    });

    if (!supervision) {
      return ResponseApi.notFound(res, 'Encadrement non trouvé');
    }

    if (supervision.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    await prisma.supervision.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Encadrement supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'encadrement:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression de l\'encadrement', error.message);
  }
};
