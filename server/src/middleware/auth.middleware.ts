import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/config.js';
import ResponseApi from '../helper/response.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): any => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return ResponseApi.error(res, 'Token manquant', {}, 401);
    }

    const decoded: any = jwt.verify(token, env.jwtSecret as string);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseApi.error(res, 'Token invalide', {}, 401);
    }
    if (error.name === 'TokenExpiredError') {
      return ResponseApi.error(res, 'Token expiré', {}, 401);
    }
    return ResponseApi.error(res, 'Erreur d\'authentification', error.message, 401);
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): any => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return ResponseApi.error(res, 'Token manquant', {}, 401);
    }
    const decoded: any = jwt.verify(token, env.jwtSecret as string);
    if (decoded.role !== 'ADMIN') {
      return ResponseApi.error(res, 'Accès refusé: privilèges administrateur requis', {}, 403);
    }
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return ResponseApi.error(res, 'Token invalide', {}, 401);
    }
    if (error.name === 'TokenExpiredError') {
      return ResponseApi.error(res, 'Token expiré', {}, 401);
    }
    return ResponseApi.error(res, 'Erreur d\'authentification', error.message, 401);
  }
};
export default authMiddleware;
