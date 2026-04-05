
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import env from '../config/config.js';
import { sendEmail } from '../utils/mailer.js';
import { deleteUploadedFile, getFileInfo } from '../helper/UploadFile.js';

// Validation Schemas
const registerSchema = yup.object().shape({
  email: yup.string().email('Email invalide').required('L\'email est requis'),
  password: yup.string().required('Le mot de passe est requis').min(6, 'Le mot de passe doit avoir au moins 6 caractères'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Les mots de passe ne correspondent pas'),
});

const loginSchema = yup.object().shape({
  email: yup.string().email('Email invalide').required('L\'email est requis'),
  password: yup.string().required('Le mot de passe est requis'),
});



// JWT Options
const jwtOptions: any = {
  expiresIn: env.jwtExpiresIn,
};

const refreshTokenOptions: any = {
  expiresIn: '7d',
};

const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Le mot de passe actuel est requis'),
  newPassword: yup
    .string()
    .required('Le nouveau mot de passe est requis')
    .min(6, 'Le mot de passe doit avoir au moins 6 caractères'),
  confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Les mots de passe ne correspondent pas'),
});

export const Register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    await registerSchema.validate({ email, password, confirmPassword });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ResponseApi.error(res, 'L\'utilisateur existe déjà', { email: 'Cet email est déjà utilisé' }, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send welcome email
    await sendEmail(
      email,
      'Bienvenue sur Dr Tchuifon',
      `Bienvenue! Votre compte a été créé avec succès.`,
      `<h1>Bienvenue!</h1><p>Votre compte a été créé avec succès sur la plateforme Dr Tchuifon. Vous pouvez maintenant compléter votre profil.</p>`
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret as string,
      jwtOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret as string,
      refreshTokenOptions
    );

    return ResponseApi.success(
      res,
      'Inscription réussie',
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de l\'inscription:', error);
    return ResponseApi.error(res, 'Erreur lors de l\'inscription', error.message);
  }
};

export const Login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Validation
    await loginSchema.validate({ email, password });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return ResponseApi.error(res, 'Email ou mot de passe incorrect', {}, 401);
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');

    if (!isPasswordValid) {
      return ResponseApi.error(res, 'Email ou mot de passe incorrect', {}, 401);
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret as string,
      jwtOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret as string,
      refreshTokenOptions
    );

    return ResponseApi.success(res, 'Connexion réussie', {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de la connexion:', error);
    return ResponseApi.error(res, 'Erreur lors de la connexion', error.message);
  }
};

export const Logout = async (req: Request, res: Response): Promise<any> => {
  try {
    // Déconnexion gérée côté client (suppression du token)
    return ResponseApi.success(res, 'Déconnexion réussie', {});
  } catch (error: any) {
    console.error('Erreur lors de la déconnexion:', error);
    return ResponseApi.error(res, 'Erreur lors de la déconnexion', error.message);
  }
};

export const GetProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return ResponseApi.notFound(res, 'Utilisateur non trouvé');
    }

    return ResponseApi.success(res, 'Utilisateur récupéré', {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du profil', error.message);
  }
};



export const ChangePassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return ResponseApi.error(res, 'Non authentifié', {}, 401);
    }

    // Validation
    await changePasswordSchema.validate({ currentPassword, newPassword, confirmPassword });

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ResponseApi.notFound(res, 'Utilisateur non trouvé');
    }

    // Compare current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '');

    if (!isPasswordValid) {
      return ResponseApi.error(res, 'Le mot de passe actuel est incorrect', {}, 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return ResponseApi.success(res, 'Mot de passe changé avec succès', {});
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors du changement de mot de passe:', error);
    return ResponseApi.error(res, 'Erreur lors du changement de mot de passe', error.message);
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return ResponseApi.error(res, 'L\'email est requis', {}, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
      return ResponseApi.success(res, 'Si cet email existe, un lien de réinitialisation a été envoyé', {});
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      env.jwtSecret as string,
      { expiresIn: '1h' }
    );

    // Send reset email
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendEmail(
      email,
      'Réinitialisation de mot de passe',
      `Cliquez sur le lien suivant pour réinitialiser votre mot de passe: ${resetLink}`,
      `<h1>Réinitialisation de mot de passe</h1><p><a href="${resetLink}">Cliquez ici pour réinitialiser votre mot de passe</a></p><p>Ce lien expire dans 1 heure.</p>`
    );

    return ResponseApi.success(res, 'Si cet email existe, un lien de réinitialisation a été envoyé', {});
  } catch (error: any) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    return ResponseApi.error(res, 'Erreur lors de la demande de réinitialisation', error.message);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return ResponseApi.error(res, 'Tous les champs sont requis', {}, 400);
    }

    if (newPassword !== confirmPassword) {
      return ResponseApi.error(res, 'Les mots de passe ne correspondent pas', {}, 400);
    }

    // Verify token
    const decoded: any = jwt.verify(token, env.jwtSecret as string);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashedPassword },
    });

    return ResponseApi.success(res, 'Mot de passe réinitialisé avec succès', {});
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseApi.error(res, 'Token invalide ou expiré', {}, 400);
    }
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return ResponseApi.error(res, 'Erreur lors de la réinitialisation du mot de passe', error.message);
  }
};

export const RefreshToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseApi.error(res, 'Le token de rafraîchissement est requis', {}, 400);
    }

    // Verify refresh token
    const decoded: any = jwt.verify(refreshToken, env.jwtSecret as string);

    // Generate new access token
    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      env.jwtSecret as string,
      jwtOptions
    );

    return ResponseApi.success(res, 'Token rafraîchi', { accessToken });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseApi.error(res, 'Token invalide ou expiré', {}, 400);
    }
    console.error('Erreur lors du rafraîchissement du token:', error);
    return ResponseApi.error(res, 'Erreur lors du rafraîchissement du token', error.message);
  }
};