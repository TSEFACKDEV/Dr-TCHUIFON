import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';

/**
 * Récupère tous les utilisateurs (profils publics)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (role && ['ADMIN', 'VISITOR'].includes(role as string)) {
      where.role = role as string;
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { profile: {
            OR: [
              { fullName: { contains: search as string, mode: 'insensitive' } },
              { bio: { contains: search as string, mode: 'insensitive' } },
            ]
          }
        },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            title: true,
            photoUrl: true,
            bio: true,
            institution: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    const total = await prisma.user.count({ where });

    return ResponseApi.success(res, 'Utilisateurs récupérés avec succès', {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des utilisateurs', error.message);
  }
};

/**
 * Récupère un utilisateur par ID (profil public)
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de l\'utilisateur est requis', {}, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
        publications: {
          where: { isPublished: true },
          select: {
            id: true,
            title: true,
            slug: true,
            abstract: true,
            year: true,
            journal: true,
          },
          orderBy: { year: 'desc' },
          take: 10,
        },
        courses: {
          select: {
            id: true,
            title: true,
            code: true,
            level: true,
            description: true,
          },
          take: 10,
        },
        supervisions: {
          select: {
            id: true,
            studentName: true,
            level: true,
            topic: true,
            status: true,
          },
          take: 10,
        },
      },
    });

    if (!user) {
      return ResponseApi.notFound(res, 'Utilisateur non trouvé');
    }

    return ResponseApi.success(res, 'Utilisateur récupéré avec succès', user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération de l\'utilisateur', error.message);
  }
};

/**
 * Récupère le profil de l'utilisateur authentifié
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            publications: true,
            courses: true,
            supervisions: true,
            collaborators: true,
          },
        },
      },
    });

    if (!user) {
      return ResponseApi.notFound(res, 'Utilisateur non trouvé');
    }

    return ResponseApi.success(res, 'Profil récupéré avec succès', user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du profil', error.message);
  }
};

/**
 * Supprimer un utilisateur (Admin uniquement)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de l\'utilisateur est requis', {}, 400);
    }

    // Vérifie que l'utilisateur actuel est admin
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'ADMIN') {
      return ResponseApi.error(res, 'Vous n\'avez pas les permissions pour effectuer cette action', {}, 403);
    }

    // Empêche un admin de se supprimer lui-même
    if (userId === id) {
      return ResponseApi.error(res, 'Vous ne pouvez pas supprimer votre propre compte', {}, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return ResponseApi.notFound(res, 'Utilisateur non trouvé');
    }

    // Supprime l'utilisateur (cascade supprimera le profil, publications, cours, etc.)
    await prisma.user.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Utilisateur supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression de l\'utilisateur', error.message);
  }
};

/**
 * Récupère les statistiques des utilisateurs et du contenu
 */
export const getUsersStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const visitors = await prisma.user.count({ where: { role: 'VISITOR' } });

    const totalPublications = await prisma.publication.count();
    const publishedPublications = await prisma.publication.count({ where: { isPublished: true } });

    const totalCourses = await prisma.course.count();
    const totalSupervisions = await prisma.supervision.count();
    const activeSupervisions = await prisma.supervision.count({ where: { status: 'IN_PROGRESS' } });
    const totalCollaborators = await prisma.collaborator.count();
    const unreadMessages = await prisma.contactMessage.count({ where: { isRead: false } });

    return ResponseApi.success(res, 'Statistiques récupérées avec succès', {
      users: {
        total: totalUsers,
        admins,
        visitors,
      },
      publications: {
        total: totalPublications,
        published: publishedPublications,
      },
      courses: {
        total: totalCourses,
      },
      supervisions: {
        total: totalSupervisions,
        active: activeSupervisions,
      },
      collaborators: {
        total: totalCollaborators,
      },
      messages: {
        unread: unreadMessages,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des statistiques', error.message);
  }
};

/**
 * Recherche les utilisateurs
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 10, role } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    if (!q) {
      return ResponseApi.error(res, 'Le terme de recherche est requis', {}, 400);
    }

    const where: any = {
      OR: [
        { email: { contains: q as string, mode: 'insensitive' } },
        { profile: {
            OR: [
              { fullName: { contains: q as string, mode: 'insensitive' } },
              { bio: { contains: q as string, mode: 'insensitive' } },
              { institution: { contains: q as string, mode: 'insensitive' } },
            ]
          }
        },
      ],
    };

    if (role && ['ADMIN', 'VISITOR'].includes(role as string)) {
      where.role = role as string;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            title: true,
            photoUrl: true,
            bio: true,
            institution: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    const total = await prisma.user.count({ where });

    return ResponseApi.success(res, 'Résultats de recherche', {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la recherche:', error);
    return ResponseApi.error(res, 'Erreur lors de la recherche', error.message);
  }
};
