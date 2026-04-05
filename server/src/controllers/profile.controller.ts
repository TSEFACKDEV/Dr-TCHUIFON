import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import { deleteUploadedFile, getFileInfo } from '../helper/UploadFile.js';

// Validation Schemas
const createProfileSchema = yup.object().shape({
  fullName: yup.string().min(2, 'Le nom doit avoir au moins 2 caractères'),
  title: yup.string().min(5, 'Le titre doit avoir au moins 5 caractères'),
  bio: yup.string().min(50, 'La bio doit avoir au moins 50 caractères'),
  specializations: yup.array().of(yup.string()),
  degrees: yup.array().of(yup.string()),
  institution: yup.string(),
  department: yup.string(),
  email: yup.string().email('Email invalide'),
  phone: yup.string(),
  officeLocation: yup.string(),
  googleScholar: yup.string().url('L\'URL doit être valide'),
  researchGate: yup.string().url('L\'URL doit être valide'),
  orcid: yup.string(),
  linkedin: yup.string().url('L\'URL doit être valide'),
  website: yup.string().url('L\'URL doit être valide'),
});

const updateProfileSchema = yup.object().shape({
  fullName: yup.string().min(2, 'Le nom doit avoir au moins 2 caractères'),
  title: yup.string().min(5, 'Le titre doit avoir au moins 5 caractères'),
  bio: yup.string().min(50, 'La bio doit avoir au moins 50 caractères'),
  specializations: yup.array().of(yup.string()),
  degrees: yup.array().of(yup.string()),
  institution: yup.string(),
  department: yup.string(),
  email: yup.string().email('Email invalide'),
  phone: yup.string(),
  officeLocation: yup.string(),
  googleScholar: yup.string().url('L\'URL doit être valide'),
  researchGate: yup.string().url('L\'URL doit être valide'),
  orcid: yup.string(),
  linkedin: yup.string().url('L\'URL doit être valide'),
  website: yup.string().url('L\'URL doit être valide'),
});

/**
 * Récupère le profil public
 */
export const getPublicProfile = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.profile.findFirst({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      return ResponseApi.notFound(res, 'Profil non trouvé');
    }

    return ResponseApi.success(res, 'Profil récupéré avec succès', profile);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du profil', error.message);
  }
};

/**
 * Récupère le profil de l'utilisateur authentifié
 */
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      return ResponseApi.notFound(res, 'Profil non trouvé');
    }

    return ResponseApi.success(res, 'Profil récupéré avec succès', profile);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du profil', error.message);
  }
};

/**
 * Crée le profil de l'utilisateur authentifié
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Parse les tableaux JSON si nécessaire
    let specializations = req.body.specializations;
    let degrees = req.body.degrees;
    
    if (typeof specializations === 'string') {
      try {
        specializations = JSON.parse(specializations);
      } catch (e) {
        specializations = [];
      }
    }
    
    if (typeof degrees === 'string') {
      try {
        degrees = JSON.parse(degrees);
      } catch (e) {
        degrees = [];
      }
    }
    
    const {
      fullName,
      title,
      bio,
      institution,
      department,
      email,
      phone,
      officeLocation,
      googleScholar,
      researchGate,
      orcid,
      linkedin,
      website,
    } = req.body;

    const files = (req as any).files || {};

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Vérifie si un profil existe déjà
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return ResponseApi.error(res, 'Un profil existe déjà pour cet utilisateur', {}, 409);
    }

    // Validation
    await createProfileSchema.validate({
      fullName,
      title,
      bio,
      specializations,
      degrees,
      institution,
      department,
      email,
      phone,
      officeLocation,
      googleScholar,
      researchGate,
      orcid,
      linkedin,
      website,
    });

    let photoUrl: string | null = null;
    let cvUrl: string | null = null;

    // Traite les fichiers
    if (files.photo) {
      const photoInfo = await getFileInfo(files.photo[0], { folder: 'profiles', resourceType: 'image' });
      photoUrl = photoInfo.url;
    }

    if (files.cv) {
      const cvInfo = await getFileInfo(files.cv[0], { folder: 'profiles', resourceType: 'raw' });
      cvUrl = cvInfo.url;
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        fullName,
        title,
        bio,
        photoUrl: photoUrl || null,
        cvUrl: cvUrl || null,
        specializations: specializations || [],
        degrees: degrees || [],
        institution: institution || null,
        department: department || null,
        email: email || null,
        phone: phone || null,
        officeLocation: officeLocation || null,
        googleScholar: googleScholar || null,
        researchGate: researchGate || null,
        orcid: orcid || null,
        linkedin: linkedin || null,
        website: website || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return ResponseApi.success(res, 'Profil créé avec succès', profile, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la création du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la création du profil', error.message);
  }
};

/**
 * Met à jour le profil de l'utilisateur authentifié
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Parse les tableaux JSON si nécessaire
    let specializations = req.body.specializations;
    let degrees = req.body.degrees;
    
    if (typeof specializations === 'string') {
      try {
        specializations = JSON.parse(specializations);
      } catch (e) {
        specializations = undefined;
      }
    }
    
    if (typeof degrees === 'string') {
      try {
        degrees = JSON.parse(degrees);
      } catch (e) {
        degrees = undefined;
      }
    }
    
    const {
      fullName,
      title,
      bio,
      institution,
      department,
      email,
      phone,
      officeLocation,
      googleScholar,
      researchGate,
      orcid,
      linkedin,
      website,
    } = req.body;

    const files = (req as any).files || {};

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      return ResponseApi.notFound(res, 'Profil non trouvé');
    }

    // Validation
    await updateProfileSchema.validate({
      fullName,
      title,
      bio,
      specializations,
      degrees,
      institution,
      department,
      email,
      phone,
      officeLocation,
      googleScholar,
      researchGate,
      orcid,
      linkedin,
      website,
    });

    let photoUrl = existingProfile.photoUrl;
    let cvUrl = existingProfile.cvUrl;

    // Traite les fichiers
    if (files.photo) {
      // Supprime l'ancienne photo
      if (existingProfile.photoUrl) {
        deleteUploadedFile(existingProfile.photoUrl);
      }
      const photoInfo = await getFileInfo(files.photo[0], { folder: 'profiles', resourceType: 'image' });
      photoUrl = photoInfo.url;
    }

    if (files.cv) {
      // Supprime l'ancien CV
      if (existingProfile.cvUrl) {
        deleteUploadedFile(existingProfile.cvUrl);
      }
      const cvInfo = await getFileInfo(files.cv[0], { folder: 'profiles', resourceType: 'raw' });
      cvUrl = cvInfo.url;
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        ...(fullName && { fullName }),
        ...(title && { title }),
        ...(bio && { bio }),
        ...(photoUrl && { photoUrl }),
        ...(cvUrl && { cvUrl }),
        ...(specializations && { specializations }),
        ...(degrees && { degrees }),
        ...(institution !== undefined && { institution }),
        ...(department !== undefined && { department }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(officeLocation !== undefined && { officeLocation }),
        ...(googleScholar !== undefined && { googleScholar }),
        ...(researchGate !== undefined && { researchGate }),
        ...(orcid !== undefined && { orcid }),
        ...(linkedin !== undefined && { linkedin }),
        ...(website !== undefined && { website }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return ResponseApi.success(res, 'Profil mis à jour avec succès', profile);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la mise à jour du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour du profil', error.message);
  }
};

/**
 * Supprime le profil de l'utilisateur authentifié
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return ResponseApi.notFound(res, 'Profil non trouvé');
    }

    // Supprime les fichiers associés
    if (profile.photoUrl) {
      deleteUploadedFile(profile.photoUrl);
    }
    if (profile.cvUrl) {
      deleteUploadedFile(profile.cvUrl);
    }

    await prisma.profile.delete({
      where: { userId },
    });

    return ResponseApi.success(res, 'Profil supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression du profil', error.message);
  }
};
