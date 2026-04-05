#!/usr/bin/env node

/**
 * Script de vérification des variables d'environnement pour Vercel
 * Ce script s'exécute pendant le build pour s'assurer que toutes les variables nécessaires sont présentes
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SMTP_USER',
  'SMTP_PASS',
  'CLOUDINARY_URL'
];

const optionalEnvVars = [
  'PORT',
  'HOST',
  'NODE_ENV',
  'FROM_EMAIL',
  'FROM_NAME',
  'ADMIN_PASS'
];

console.log('🔍 Vérification des variables d\'environnement pour Vercel...\n');

let hasErrors = false;

console.log('📋 Variables requises:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: MANQUANTE`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: Présente`);
  }
});

console.log('\n📋 Variables optionnelles:');
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: Présente`);
  } else {
    console.log(`⚠️  ${envVar}: Non définie (optionnel)`);
  }
});

if (hasErrors) {
  console.log('\n❌ Erreur: Variables d\'environnement manquantes. Définissez-les dans le dashboard Vercel.');
  process.exit(1);
} else {
  console.log('\n✅ Toutes les variables requises sont présentes.');
}