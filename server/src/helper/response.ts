import { Response } from 'express';

/**
 * Classe utilitaire pour standardiser les réponses API
 * Format professionnel et cohérent pour toutes les réponses
 */
class ResponseApi {
  /**
   * Réponse de succès standardisée
   * @param res - Objet Response Express
   * @param message - Message de succès
   * @param data - Données à retourner
   * @param statusCode - Code HTTP (défaut: 200)
   */
  static success(res: Response, message: string, data?: any, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data || null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse d'erreur standardisée
   * @param res - Objet Response Express
   * @param message - Message d'erreur principal
   * @param error - Détails de l'erreur
   * @param statusCode - Code HTTP (défaut: 500)
   */
  static error(res: Response, message: string, error?: any, statusCode = 500) {
    // En production, ne pas exposer les détails techniques
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return res.status(statusCode).json({
      success: false,
      message,
      error: isDevelopment ? error : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse pour ressource non trouvée
   * @param res - Objet Response Express
   * @param message - Message personnalisé (défaut: 'Ressource non trouvée')
   */
  static notFound(res: Response, message = 'Ressource non trouvée') {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse pour erreur de validation
   * @param res - Objet Response Express
   * @param errors - Tableau ou objet d'erreurs de validation
   */
  static validationError(res: Response, errors: any) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse pour erreur d'authentification
   * @param res - Objet Response Express
   * @param message - Message d'erreur (défaut: 'Non autorisé')
   */
  static unauthorized(res: Response, message = 'Authentification requise') {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse pour erreur de permissions
   * @param res - Objet Response Express
   * @param message - Message d'erreur (défaut: 'Accès interdit')
   */
  static forbidden(res: Response, message = 'Accès interdit - Permissions insuffisantes') {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Réponse avec pagination
   * @param res - Objet Response Express
   * @param message - Message de succès
   * @param data - Données paginées
   * @param pagination - Informations de pagination
   */
  static paginated(
    res: Response,
    message: string,
    data: any[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    }
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }
}

export default ResponseApi;
