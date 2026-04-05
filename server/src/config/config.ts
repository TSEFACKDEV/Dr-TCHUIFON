import dotenv from 'dotenv';

dotenv.config();

interface Env {
  // Database
  databaseUrl: string;

  // Server
  port: number;
  host: string;
  nodeEnv: string;
  NODE_ENV: string;

  // JWT configuration
  jwtSecret: string;
  jwtExpiresIn: string;

  // SMTP configuration
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  adminPass: string;
  fromEmail?: string;
  fromName?: string;

  // Cloudinary
  cloudinaryUrl: string;
}

// Validation des variables d'environnement critiques en production
const validateEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SMTP_USER',
      'SMTP_PASS',
      'CLOUDINARY_URL'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(
        `❌ Variables d'environnement manquantes en production: ${missing.join(', ')}`
      );
    }

    // Vérifier que JWT_SECRET est assez fort
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('❌ JWT_SECRET doit contenir au moins 32 caractères en production');
    }
  }
};

validateEnv();

const env: Env = {
  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Server
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT configuration - pas de valeur par défaut en production
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  // SMTP configuration
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  adminPass: process.env.ADMIN_PASS || '',
  fromEmail: process.env.FROM_EMAIL || '',
  fromName: process.env.FROM_NAME || 'Dr Tchuifon',

  // Cloudinary
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
};

export default env;
