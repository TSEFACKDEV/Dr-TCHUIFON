import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import { deleteUploadedFile, getFileInfo } from '../helper/UploadFile.js';

// Validation Schemas - Tous les champs sont optionnels
const createPublicationSchema = yup.object().shape({
  title: yup.string().optional().nullable().min(5, 'Le titre doit avoir au moins 5 caractères'),
  slug: yup.string().optional().nullable().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Le slug doit être en minuscules avec des tirets'),
  abstract: yup.string().optional().nullable().min(10, 'Le résumé doit avoir au moins 10 caractères'),
  authors: yup.array().optional().nullable().of(yup.string()),
  type: yup.string().optional().nullable().oneOf(['ARTICLE', 'CONFERENCE', 'BOOK_CHAPTER', 'THESIS', 'PATENT', 'POSTER'], 'Le type doit être valide'),
  journal: yup.string().optional().nullable(),
  conference: yup.string().optional().nullable(),
  publicationDate: yup.string().optional().nullable(),
  year: yup.number().optional().nullable().positive().integer(),
  volume: yup.string().optional().nullable(),
  issue: yup.string().optional().nullable(),
  pages: yup.string().optional().nullable(),
  publisher: yup.string().optional().nullable(),
  doi: yup.string().optional().nullable(),
  isbn: yup.string().optional().nullable(),
  issn: yup.string().optional().nullable(),
  keywords: yup.array().optional().nullable().of(yup.string()),
  citations: yup.number().optional().nullable().min(0).integer(),
  isPublished: yup.boolean().optional().nullable(),
});

const updatePublicationSchema = yup.object().shape({
  title: yup.string().optional().nullable().min(5, 'Le titre doit avoir au moins 5 caractères'),
  slug: yup.string().optional().nullable().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Le slug doit être en minuscules avec des tirets'),
  abstract: yup.string().optional().nullable().min(10, 'Le résumé doit avoir au moins 10 caractères'),
  authors: yup.array().optional().nullable().of(yup.string()),
  type: yup.string().optional().nullable().oneOf(['ARTICLE', 'CONFERENCE', 'BOOK_CHAPTER', 'THESIS', 'PATENT', 'POSTER'], 'Le type doit être valide'),
  journal: yup.string().optional().nullable(),
  conference: yup.string().optional().nullable(),
  publicationDate: yup.string().optional().nullable(),
  year: yup.number().optional().nullable().positive().integer(),
  volume: yup.string().optional().nullable(),
  issue: yup.string().optional().nullable(),
  pages: yup.string().optional().nullable(),
  publisher: yup.string().optional().nullable(),
  doi: yup.string().optional().nullable(),
  isbn: yup.string().optional().nullable(),
  issn: yup.string().optional().nullable(),
  keywords: yup.array().optional().nullable().of(yup.string()),
  citations: yup.number().optional().nullable().min(0).integer(),
  isPublished: yup.boolean().optional().nullable(),
});

// Helper function pour générer un slug unique
const generateUniqueSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.publication.findUnique({
      where: { slug },
    });
    
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Génère un slug à partir d'un titre
 */
const slugifyTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD') // Normalise les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
    .replace(/^-|-$/g, ''); // Supprime les tirets au début et à la fin
};

/**
 * Récupère toutes les publications publiées (publique)
 */
export const getAllPublications = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 0, search, type, year } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    const where: any = { isPublished: true };

    if (type && ['ARTICLE', 'CONFERENCE', 'BOOK_CHAPTER', 'THESIS', 'PATENT', 'POSTER'].includes(type as string)) {
      where.type = type as string;
    }

    if (year) {
      where.year = parseInt(year as string);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { abstract: { contains: search as string, mode: 'insensitive' } },
        { keywords: { hasSome: [search as string] } },
      ];
    }

    const publications = await prisma.publication.findMany({
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
        collaborators: {
          include: {
            collaborator: {
              select: {
                id: true,
                name: true,
                institution: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.publication.count({ where });

    return ResponseApi.paginated(
      res,
      'Publications récupérées avec succès',
      publications,
      {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      }
    );
  } catch (error: any) {
    console.error('❌ Erreur getAllPublications:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des publications', error.message, 500);
  }
};

/**
 * Récupère une publication par slug (publique)
 */
export const getPublicationBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return ResponseApi.error(res, 'Le slug de la publication est requis', {}, 400);
    }

    const publication = await prisma.publication.findUnique({
      where: { slug },
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
        collaborators: {
          include: {
            collaborator: {
              select: {
                id: true,
                name: true,
                title: true,
                institution: true,
                country: true,
                photoUrl: true,
                googleScholar: true,
                orcid: true,
              },
            },
          },
        },
      },
    });

    if (!publication) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    // Vérifie si la publication est publiée ou si l'utilisateur est le propriétaire
    const userId = (req as any).userId;
    if (!publication.isPublished && publication.userId !== userId) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    return ResponseApi.success(res, 'Publication récupérée avec succès', publication);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la publication:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération de la publication', error.message);
  }
};

/**
 * Récupère une publication par ID
 */
export const getPublicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de la publication est requis', {}, 400);
    }

    const publication = await prisma.publication.findUnique({
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
              },
            },
          },
        },
        collaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    });

    if (!publication) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    // Vérifie si la publication est publiée ou si l'utilisateur est le propriétaire
    const userId = (req as any).userId;
    if (!publication.isPublished && publication.userId !== userId) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    return ResponseApi.success(res, 'Publication récupérée avec succès', publication);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la publication:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération de la publication', error.message);
  }
};

/**
 * Récupère les publications de l'utilisateur authentifié
 */
export const getMyPublications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 0, isPublished } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : undefined;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const where: any = { userId };

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const publications = await prisma.publication.findMany({
      where,
      include: {
        collaborators: {
          include: {
            collaborator: {
              select: {
                id: true,
                name: true,
                institution: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {}),
    });

    const total = await prisma.publication.count({ where });

    return ResponseApi.success(res, 'Publications récupérées avec succès', {
      publications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des publications:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des publications', error.message);
  }
};

/**
 * Crée une nouvelle publication (admin uniquement)
 */
export const createPublication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      title,
      slug,
      abstract,
      authors,
      type,
      journal,
      conference,
      publicationDate,
      year,
      volume,
      issue,
      pages,
      publisher,
      doi,
      isbn,
      issn,
      keywords,
      citations,
      isPublished,
    } = req.body;

    const file = (req as any).file;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Parse arrays if they are strings
    const parsedAuthors = typeof authors === 'string' ? JSON.parse(authors) : authors;
    const parsedKeywords = typeof keywords === 'string' ? JSON.parse(keywords) : keywords || [];

    // Validation
    await createPublicationSchema.validate({
      title,
      slug,
      abstract,
      authors: parsedAuthors,
      type,
      journal,
      conference,
      publicationDate,
      year,
      volume,
      issue,
      pages,
      publisher,
      doi,
      isbn,
      issn,
      keywords: parsedKeywords,
      citations,
      isPublished,
    });

    // Génère un slug à partir du titre si non fourni
    const baseSlug = slug || slugifyTitle(title || 'publication');
    const uniqueSlug = await generateUniqueSlug(baseSlug);

    let pdfUrl: string | null = null;

    // Traite le PDF
    if (file) {
      const fileInfo = await getFileInfo(file, { folder: 'publications', resourceType: 'raw' });
      pdfUrl = fileInfo.url;
    }

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

    const publication = await prisma.publication.create({
      data: {
        userId,
        title: title || null,
        slug: uniqueSlug,
        abstract: abstract || null,
        authors: parsedAuthors || [],
        type: type || 'ARTICLE',
        journal: journal || null,
        conference: conference || null,
        publicationDate: parseDate(publicationDate),
        year: year ? parseInt(year as string) : null,
        volume: volume || null,
        issue: issue || null,
        pages: pages || null,
        publisher: publisher || null,
        doi: doi || null,
        isbn: isbn || null,
        issn: issn || null,
        pdfUrl: pdfUrl || null,
        keywords: parsedKeywords,
        citations: citations ? parseInt(citations as string) : 0,
        isPublished: isPublished === 'true' || isPublished === true,
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

    return ResponseApi.success(res, 'Publication créée avec succès', publication, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la création de la publication:', error);
    return ResponseApi.error(res, 'Erreur lors de la création de la publication', error.message);
  }
};

/**
 * Met à jour une publication (admin uniquement)
 */
export const updatePublication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const {
      title,
      slug,
      abstract,
      authors,
      type,
      journal,
      conference,
      publicationDate,
      year,
      volume,
      issue,
      pages,
      publisher,
      doi,
      isbn,
      issn,
      keywords,
      citations,
      isPublished,
    } = req.body;

    const file = (req as any).file;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de la publication est requis', {}, 400);
    }

    const existingPublication = await prisma.publication.findUnique({
      where: { id },
    });

    if (!existingPublication) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    if (existingPublication.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Parse arrays if they are strings
    const parsedAuthors = authors ? (typeof authors === 'string' ? JSON.parse(authors) : authors) : undefined;
    const parsedKeywords = keywords ? (typeof keywords === 'string' ? JSON.parse(keywords) : keywords) : undefined;

    // Validation
    await updatePublicationSchema.validate({
      title,
      slug,
      abstract,
      authors: parsedAuthors,
      type,
      journal,
      conference,
      publicationDate,
      year,
      volume,
      issue,
      pages,
      publisher,
      doi,
      isbn,
      issn,
      keywords: parsedKeywords,
      citations,
      isPublished,
    });

    // Génère un slug unique si modifié ou si le titre change
    let uniqueSlug = existingPublication.slug;
    if (slug && slug !== existingPublication.slug) {
      uniqueSlug = await generateUniqueSlug(slug, id);
    } else if (title && title !== existingPublication.title && !slug) {
      // Si le titre change mais pas de slug fourni, on régénère le slug
      const baseSlug = slugifyTitle(title);
      uniqueSlug = await generateUniqueSlug(baseSlug, id);
    }

    let pdfUrl = existingPublication.pdfUrl;

    // Traite le PDF
    if (file) {
      // Supprime l'ancien PDF
      if (existingPublication.pdfUrl) {
        deleteUploadedFile(existingPublication.pdfUrl);
      }
      const fileInfo = await getFileInfo(file, { folder: 'publications', resourceType: 'raw' });
      pdfUrl = fileInfo.url;
    }

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

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (slug && uniqueSlug !== existingPublication.slug) updateData.slug = uniqueSlug;
    if (abstract !== undefined) updateData.abstract = abstract;
    if (parsedAuthors !== undefined) updateData.authors = parsedAuthors;
    if (type !== undefined) updateData.type = type;
    if (journal !== undefined) updateData.journal = journal;
    if (conference !== undefined) updateData.conference = conference;
    if (publicationDate !== undefined) updateData.publicationDate = parseDate(publicationDate);
    if (year !== undefined) updateData.year = year ? parseInt(year as string) : null;
    if (volume !== undefined) updateData.volume = volume;
    if (issue !== undefined) updateData.issue = issue;
    if (pages !== undefined) updateData.pages = pages;
    if (publisher !== undefined) updateData.publisher = publisher;
    if (doi !== undefined) updateData.doi = doi;
    if (isbn !== undefined) updateData.isbn = isbn;
    if (issn !== undefined) updateData.issn = issn;
    if (pdfUrl) updateData.pdfUrl = pdfUrl;
    if (parsedKeywords !== undefined) updateData.keywords = parsedKeywords;
    if (citations !== undefined) updateData.citations = citations ? parseInt(citations as string) : 0;
    if (isPublished !== undefined) updateData.isPublished = isPublished === 'true' || isPublished === true;

    const publication = await prisma.publication.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return ResponseApi.success(res, 'Publication mise à jour avec succès', publication);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la mise à jour de la publication:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour de la publication', error.message);
  }
};

/**
 * Supprime une publication (admin uniquement)
 */
export const deletePublication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    if (!id) {
      return ResponseApi.error(res, 'L\'ID de la publication est requis', {}, 400);
    }

    const publication = await prisma.publication.findUnique({
      where: { id },
    });

    if (!publication) {
      return ResponseApi.notFound(res, 'Publication non trouvée');
    }

    if (publication.userId !== userId) {
      return ResponseApi.error(res, 'Non autorisé', {}, 403);
    }

    // Supprime le PDF si existe
    if (publication.pdfUrl) {
      deleteUploadedFile(publication.pdfUrl);
    }

    await prisma.publication.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Publication supprimée avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression de la publication:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression de la publication', error.message);
  }
};
