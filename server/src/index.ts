import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import env from './config/config.js';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import ResponseApi from './helper/response.js';

const app = express();

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));



app.use(cors());

// Trust proxy - important pour obtenir la vraie IP derrière un reverse proxy
if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());



// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
  });
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'API Dr. Tchuifon - Valorisation de Recherche',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  ResponseApi.error(res, 'Route non trouvée', `La route ${req.method} ${req.url} n'existe pas`, 404);
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Logger les erreurs en production avec plus de détails
  if (env.nodeEnv === 'production') {
    // En production, utiliser un service de logging (Sentry, Winston, etc.)
    console.error('[ERROR]', {
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  } else {
    console.error('❌ Erreur serveur:', err);
  }
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ResponseApi.error(res, 'Fichier trop volumineux', 'La taille du fichier dépasse la limite autorisée', 400);
    }
    return ResponseApi.error(res, 'Erreur d\'upload', err.message, 400);
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseApi.error(res, 'Erreur de validation', err.message, 400);
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseApi.error(res, 'Token invalide', 'Le token d\'authentification est invalide', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return ResponseApi.error(res, 'Token expiré', 'Le token d\'authentification a expiré', 401);
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = env.nodeEnv === 'production' ? 'Erreur serveur interne' : err.message;
  
  ResponseApi.error(res, 'Erreur serveur', message, statusCode);
});



export default app; 

