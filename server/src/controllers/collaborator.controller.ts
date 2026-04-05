import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import { deleteUploadedFile, getFileInfo } from '../helper/UploadFile.js';

// Validation Schemas - Tous les champs sont optionnels
const createCollaboratorSchema = yup.object().shape({
  name: yup.string().optional().nullable().min(5, 'Le nom doit avoir au moins 5 caractères'),
  institution: yup.string().optional().nullable().min(5, 'L\'institution doit avoir au moins 5 caractères'),
  title: yup.string().optional().nullable(),
  department: yup.string().optional().nullable(),
  country: yup.string().optional().nullable(),
  email: yup.string().optional().nullable().email('Email invalide'),
  website: yup.string().optional().nullable().url('L\'URL doit être valide'),
  researchArea: yup.string().optional().nullable(),
  googleScholar: yup.string().optional().nullable().url('L\'URL doit être valide'),
  orcid: yup.string().optional().nullable(),
});

const updateCollaboratorSchema = yup.object().shape({
  name: yup.string().optional().nullable().min(5, 'Le nom doit avoir au moins 5 caractères'),
  institution: yup.string().optional().nullable().min(5, 'L\'institution doit avoir au moins 5 caractères'),
  title: yup.string().optional().nullable(),
  department: yup.string().optional().nullable(),
  country: yup.string().optional().nullable(),
  email: yup.string().optional().nullable().email('Email invalide'),
  website: yup.string().optional().nullable().url('L\'URL doit être valide'),
  researchArea: yup.string().optional().nullable(),
  googleScholar: yup.string().optional().nullable().url('L\'URL doit être valide'),
  orcid: yup.string().optional().nullable(),
});

/**
 * Récupère tous les collaborateurs (publics)
 */
export const getAllCollaborators = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 0, search, country } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    const where: any = {};

    if (country) {
      where.country = country as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { institution: { contains: search as string, mode: 'insensitive' } },
        { researchArea: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const collaborators = await prisma.collaborator.findMany({
      where,
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
        publications: {
          include: {
            publication: {
              select: {
                id: true,
                title: true,
                slug: true,
                year: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.collaborator.count({ where });

    return ResponseApi.success(res, 'Collaborateurs récupérés avec succès', {
      collaborators,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des collaborateurs:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des collaborateurs', error.message);
  }
};

/**
 * Récupère un collaborateur par ID
 */
export const getCollaboratorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du collaborateur est requis', {}, 400);
    }

    const collaborator = await prisma.collaborator.findUnique({
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
              },
            },
          },
        },
        publications: {
          include: {
            publication: {
              select: {
                id: true,
                title: true,
                slug: true,
                abstract: true,
                year: true,
                journal: true,
              },
            },
          },
        },
      },
    });

    if (!collaborator) {
      return ResponseApi.notFound(res, 'Collaborateur non trouvé');
    }

    return ResponseApi.success(res, 'Collaborateur récupéré avec succès', collaborator);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du collaborateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du collaborateur', error.message);
  }
};

/**
 * Récupère les collaborateurs de l'utilisateur authentifié
 */
export const getMyCollaborators = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 0 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const collaborators = await prisma.collaborator.findMany({
      where: { userId },
      include: {
        publications: {
          include: {
            publication: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.collaborator.count({ where: { userId } });

    return ResponseApi.success(res, 'Collaborateurs récupérés avec succès', {
      collaborators,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des collaborateurs:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des collaborateurs', error.message);
  }
};

/**
 * Crée un nouveau collaborateur
 */
export const createCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      title,
      institution,
      department,
      country,
      email,
      website,
      researchArea,
      googleScholar,
      orcid,
    } = req.body;

    const file = (req as any).file;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Validation
    await createCollaboratorSchema.validate({
      name,
      title,
      institution,
      department,
      country,
      email,
      website,
      researchArea,
      googleScholar,
      orcid,
    });

    let photoUrl: string | null = null;

    // Traite la photo
    if (file) {
      const fileInfo = await getFileInfo(file, { folder: 'collaborators', resourceType: 'image' });
      photoUrl = fileInfo.url;
    }

    const collaborator = await prisma.collaborator.create({
      data: {
        userId,
        name: name || null,
        title: title || null,
        institution: institution || null,
        department: department || null,
        country: country || null,
        email: email || null,
        website: website || null,
        photoUrl: photoUrl || null,
        researchArea: researchArea || null,
        googleScholar: googleScholar || null,
        orcid: orcid || null,
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

    return ResponseApi.success(res, 'Collaborateur créé avec succès', collaborator, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la création du collaborateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la création du collaborateur', error.message);
  }
};

/**
 * Met à jour un collaborateur
 */
export const updateCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const {
      name,
      title,
      institution,
      department,
      country,
      email,
      website,
      researchArea,
      googleScholar,
      orcid,
    } = req.body;

    const file = (req as any).file;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du collaborateur est requis', {}, 400);
    }

    const existingCollaborator = await prisma.collaborator.findUnique({
      where: { id },
    });

    if (!existingCollaborator) {
      return ResponseApi.notFound(res, 'Collaborateur non trouvé');
    }

    if (existingCollaborator.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Validation
    await updateCollaboratorSchema.validate({
      name,
      title,
      institution,
      department,
      country,
      email,
      website,
      researchArea,
      googleScholar,
      orcid,
    });

    let photoUrl = existingCollaborator.photoUrl;

    // Traite la photo
    if (file) {
      // Supprime l'ancienne photo
      if (existingCollaborator.photoUrl) {
        deleteUploadedFile(existingCollaborator.photoUrl);
      }
      const fileInfo = await getFileInfo(file, { folder: 'collaborators', resourceType: 'image' });
      photoUrl = fileInfo.url;
    }

    const collaborator = await prisma.collaborator.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(institution !== undefined && { institution }),
        ...(department !== undefined && { department }),
        ...(country !== undefined && { country }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(photoUrl && { photoUrl }),
        ...(researchArea !== undefined && { researchArea }),
        ...(googleScholar !== undefined && { googleScholar }),
        ...(orcid !== undefined && { orcid }),
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

    return ResponseApi.success(res, 'Collaborateur mis à jour avec succès', collaborator);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la mise à jour du collaborateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour du collaborateur', error.message);
  }
};

/**
 * Supprime un collaborateur
 */
export const deleteCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du collaborateur est requis', {}, 400);
    }

    const collaborator = await prisma.collaborator.findUnique({
      where: { id },
    });

    if (!collaborator) {
      return ResponseApi.notFound(res, 'Collaborateur non trouvé');
    }

    if (collaborator.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Supprime la photo si elle existe
    if (collaborator.photoUrl) {
      deleteUploadedFile(collaborator.photoUrl);
    }

    await prisma.collaborator.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Collaborateur supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression du collaborateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression du collaborateur', error.message);
  }
};

/**
 * Lie un collaborateur à une publication
 */
export const linkCollaboratorToPublication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { collaboratorId, publicationId } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!collaboratorId || !publicationId) {
      return ResponseApi.error(res, 'L\'ID du collaborateur et de la publication sont requis', {}, 400);
    }

    // Vérifie que le collaborateur et la publication appartiennent à l'utilisateur
    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });

    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    });

    if (!collaborator || !publication) {
      return ResponseApi.notFound(res, 'Collaborateur ou publication non trouvé');
    }

    if (collaborator.userId !== userId || publication.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Crée le lien
    const link = await prisma.publicationCollaborator.create({
      data: {
        collaboratorId,
        publicationId,
      },
    });

    return ResponseApi.success(res, 'Collaborateur lié à la publication avec succès', link, 201);
  } catch (error: any) {
    // Gère l'erreur de contrainte unique
    if (error.code === 'P2002') {
      return ResponseApi.error(res, 'Ce collaborateur est déjà lié à cette publication', {}, 409);
    }
    console.error('Erreur lors de la liaison du collaborateur:', error);
    return ResponseApi.error(res, 'Erreur lors de la liaison du collaborateur', error.message);
  }
};

/**
 * Supprime le lien entre un collaborateur et une publication
 */
export const unlinkCollaboratorFromPublication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { collaboratorId, publicationId } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!collaboratorId || !publicationId) {
      return ResponseApi.error(res, 'L\'ID du collaborateur et de la publication sont requis', {}, 400);
    }

    // Vérifie que le collaborateur et la publication appartiennent à l'utilisateur
    const collaborator = await prisma.collaborator.findUnique({
      where: { id: collaboratorId },
    });

    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    });

    if (!collaborator || !publication) {
      return ResponseApi.notFound(res, 'Collaborateur ou publication non trouvé');
    }

    if (collaborator.userId !== userId || publication.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Supprime le lien
    await prisma.publicationCollaborator.delete({
      where: {
        publicationId_collaboratorId: {
          publicationId,
          collaboratorId,
        },
      },
    });

    return ResponseApi.success(res, 'Lien supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression du lien:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression du lien', error.message);
  }
};
