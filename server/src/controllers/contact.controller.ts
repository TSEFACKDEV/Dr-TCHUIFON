import { Request, Response } from 'express';
import * as yup from 'yup';
import prisma from '../model/prisma.client.js';
import ResponseApi from '../helper/response.js';
import { sendEmail } from '../utils/mailer.js';

// Validation Schema
const sendMessageSchema = yup.object().shape({
  name: yup.string().min(2, 'Le nom doit avoir au moins 2 caractères'),
  email: yup.string().email('Email invalide'),
  subject: yup.string().min(3, 'Le sujet doit avoir au moins 3 caractères'),
  message: yup.string().min(10, 'Le message doit avoir au moins 10 caractères'),
});

/**
 * Envoie un message de contact (public)
 */
export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    await sendMessageSchema.validate({ name, email, subject, message });

    // Crée le message
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    // Envoie une notification par email à l'administrateur
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: {
        profile: true,
      },
    });

    if (adminUser && adminUser.email) {
      await sendEmail(
        adminUser.email,
        `Nouveau message de contact: ${subject}`,
        `Vous avez reçu un nouveau message de contact de ${name} (${email}):\n\n${message}`,
        `
          <h2>Nouveau message de contact</h2>
          <p><strong>De:</strong> ${name} (${email})</p>
          <p><strong>Sujet:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      );
    }

    // Envoie une confirmation à l'expéditeur
    await sendEmail(
      email,
      'Confirmation de réception de votre message',
      `Bonjour ${name},\n\nNous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.\n\nCordialement,\nL'équipe`,
      `
        <h2>Confirmation de réception</h2>
        <p>Bonjour ${name},</p>
        <p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
        <p>Cordialement,<br>L'équipe</p>
      `
    );

    return ResponseApi.success(res, 'Message envoyé avec succès', contactMessage, 201);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return ResponseApi.error(res, 'Erreur de validation', error.errors, 400);
    }
    console.error('Erreur lors de l\'envoi du message:', error);
    return ResponseApi.error(res, 'Erreur lors de l\'envoi du message', error.message);
  }
};

/**
 * Récupère tous les messages de contact (admin uniquement)
 */
export const getAllContactMessages = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limitNum,
    });

    const total = await prisma.contactMessage.count({ where });

    return ResponseApi.success(res, 'Messages récupérés avec succès', {
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des messages:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des messages', error.message);
  }
};

/**
 * Récupère un message de contact par ID (admin uniquement)
 */
export const getContactMessageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du message est requis', {}, 400);
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return ResponseApi.notFound(res, 'Message non trouvé');
    }

    return ResponseApi.success(res, 'Message récupéré avec succès', message);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du message:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération du message', error.message);
  }
};

/**
 * Marque un message comme lu (admin uniquement)
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du message est requis', {}, 400);
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return ResponseApi.notFound(res, 'Message non trouvé');
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    return ResponseApi.success(res, 'Message marqué comme lu', updatedMessage);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du message:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour du message', error.message);
  }
};

/**
 * Marque un message comme non lu (admin uniquement)
 */
export const markMessageAsUnread = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du message est requis', {}, 400);
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return ResponseApi.notFound(res, 'Message non trouvé');
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: false },
    });

    return ResponseApi.success(res, 'Message marqué comme non lu', updatedMessage);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du message:', error);
    return ResponseApi.error(res, 'Erreur lors de la mise à jour du message', error.message);
  }
};

/**
 * Supprime un message de contact (admin uniquement)
 */
export const deleteContactMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ResponseApi.error(res, 'L\'ID du message est requis', {}, 400);
    }

    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return ResponseApi.notFound(res, 'Message non trouvé');
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return ResponseApi.success(res, 'Message supprimé avec succès', {});
  } catch (error: any) {
    console.error('Erreur lors de la suppression du message:', error);
    return ResponseApi.error(res, 'Erreur lors de la suppression du message', error.message);
  }
};

/**
 * Récupère les statistiques des messages de contact (admin uniquement)
 */
export const getContactStats = async (req: Request, res: Response) => {
  try {
    const total = await prisma.contactMessage.count();
    const unread = await prisma.contactMessage.count({ where: { isRead: false } });
    const read = await prisma.contactMessage.count({ where: { isRead: true } });

    return ResponseApi.success(res, 'Statistiques récupérées avec succès', {
      total,
      unread,
      read,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return ResponseApi.error(res, 'Erreur lors de la récupération des statistiques', error.message);
  }
};
