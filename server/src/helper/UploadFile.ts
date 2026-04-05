import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import env from '../config/config.js';

// Type des clés de fichiers
export type FileType = 'image' | 'pdf' | 'document' | 'audio' | 'video';

type UploadOptions = {
  folder?: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
};

export interface FileInfo {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  publicId?: string;
}

// Types de fichiers acceptés
const ALLOWED_TYPES: Record<FileType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  pdf: ['application/pdf'],
  document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
};

// Extensions de fichiers autorisées
const ALLOWED_EXTENSIONS: Record<FileType, string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  pdf: ['.pdf'],
  document: ['.doc', '.docx'],
  audio: ['.mp3', '.wav', '.ogg'],
  video: ['.mp4', '.mov', '.avi'],
};

// Limites de taille (en bytes)
const SIZE_LIMITS: Record<FileType, number> = {
  image: 5 * 1024 * 1024, // 5 MB
  pdf: 50 * 1024 * 1024, // 50 MB
  document: 25 * 1024 * 1024, // 25 MB
  audio: 100 * 1024 * 1024, // 100 MB
  video: 500 * 1024 * 1024, // 500 MB
};

const isCloudinaryEnabled = Boolean(env.cloudinaryUrl);

if (isCloudinaryEnabled) {
  cloudinary.config({ secure: true });
}

/**
 * Crée un dossier s'il n'existe pas
 */
const ensureUploadDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Crée une configuration de stockage pour multer
 */
const createStorageConfig = (uploadDir: string): StorageEngine => {
  if (isCloudinaryEnabled) {
    return multer.memoryStorage();
  }

  return multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      ensureUploadDirectory(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
      cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
    },
  });
};

/**
 * Crée un filtre de fichier
 */
const createFileFilter = (allowedMimeTypes: string[], allowedExtensions: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`Extension non autorisée: ${ext}`));
    }

    cb(null, true);
  };
};

const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
) => {
  if (!isCloudinaryEnabled) {
    throw new Error('Cloudinary n\'est pas configuré.');
  }

  const ext = path.extname(file.originalname);
  const name = path.basename(file.originalname, ext);
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
  const publicId = `${folder}/${sanitizedName}-${Date.now()}`;

  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Erreur lors de l\'upload vers Cloudinary.'));
        }
        resolve(result);
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

export const uploadImage = multer({
  storage: createStorageConfig('uploads/images'),
  fileFilter: createFileFilter(ALLOWED_TYPES.image, ALLOWED_EXTENSIONS.image),
  limits: {
    fileSize: SIZE_LIMITS.image,
  },
});

export const uploadPdf = multer({
  storage: createStorageConfig('uploads/pdfs'),
  fileFilter: createFileFilter(ALLOWED_TYPES.pdf, ALLOWED_EXTENSIONS.pdf),
  limits: {
    fileSize: SIZE_LIMITS.pdf,
  },
});

export const uploadDocument = multer({
  storage: createStorageConfig('uploads/documents'),
  fileFilter: createFileFilter(
    [...ALLOWED_TYPES.pdf, ...ALLOWED_TYPES.document],
    [...ALLOWED_EXTENSIONS.pdf, ...ALLOWED_EXTENSIONS.document]
  ),
  limits: {
    fileSize: SIZE_LIMITS.document,
  },
});

export const uploadProfile = multer({
  storage: createStorageConfig('uploads/profiles'),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      ...ALLOWED_TYPES.image,
      ...ALLOWED_TYPES.pdf,
      ...ALLOWED_TYPES.document,
    ];
    const allowedExts = [
      ...ALLOWED_EXTENSIONS.image,
      ...ALLOWED_EXTENSIONS.pdf,
      ...ALLOWED_EXTENSIONS.document,
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export const createUploadService = (
  fileType: FileType,
  uploadDir?: string,
  customSizeLimit?: number
) => {
  const mimeTypes = ALLOWED_TYPES[fileType];
  const extensions = ALLOWED_EXTENSIONS[fileType];
  const sizeLimit = customSizeLimit || SIZE_LIMITS[fileType];
  const dir = uploadDir || `uploads/${fileType}s`;

  return multer({
    storage: createStorageConfig(dir),
    fileFilter: createFileFilter(mimeTypes, extensions),
    limits: {
      fileSize: sizeLimit,
    },
  });
};

export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux',
        error: error.message,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers',
        error: error.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Erreur d\'upload',
      error: error.message,
    });
  }

  if (error instanceof Error) {
    return res.status(400).json({
      success: false,
      message: 'Erreur lors de l\'upload',
      error: error.message,
    });
  }

  next(error);
};

export const createMultipleFilesUpload = (
  fileType: FileType,
  maxFiles: number = 10,
  uploadDir?: string,
  customSizeLimit?: number
) => {
  const mimeTypes = ALLOWED_TYPES[fileType];
  const extensions = ALLOWED_EXTENSIONS[fileType];
  const sizeLimit = customSizeLimit || SIZE_LIMITS[fileType];
  const dir = uploadDir || `uploads/${fileType}s`;

  return multer({
    storage: createStorageConfig(dir),
    fileFilter: createFileFilter(mimeTypes, extensions),
    limits: {
      fileSize: sizeLimit,
      files: maxFiles,
    },
  });
};

export const deleteUploadedFile = (filePath: string): boolean => {
  if (!filePath) {
    return false;
  }

  if (typeof filePath === 'string' && filePath.startsWith('http')) {
    if (isCloudinaryEnabled && filePath.includes('res.cloudinary.com')) {
      const publicId = parseCloudinaryPublicId(filePath);
      if (!publicId) {
        console.error('Impossible de parser le public_id Cloudinary pour:', filePath);
        return false;
      }

      cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }, (error, result) => {
        if (error) {
          console.error('Erreur Cloudinary destroy:', error);
        }
        return result?.result === 'ok' || result?.result === 'not found';
      });

      return true;
    }

    // Pas de suppression sur d'autres URL distantes
    return false;
  }

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier local:', error);
      return false;
    }
  }

  return false;
};

const parseCloudinaryPublicId = (url: string): string | null => {
  const cleanUrl = url.split('?')[0];
  const match = cleanUrl.match(/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  if (!match || !match[1]) {
    return null;
  }
  return match[1];
};

export const getFileInfo = async (
  file: Express.Multer.File,
  options?: UploadOptions
): Promise<FileInfo> => {
  if (!file) {
    throw new Error('Fichier introuvable');
  }

  if (file.buffer && options?.folder) {
    const resourceType = options.resourceType || 'auto';
    const uploadResult = await uploadBufferToCloudinary(file, options.folder, resourceType);

    return {
      originalName: file.originalname,
      filename: uploadResult.public_id || file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path || '',
      url: uploadResult.secure_url || uploadResult.url,
      publicId: uploadResult.public_id,
    };
  }

  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path || '',
    url: file.path ? `/${file.path.replace(/\\/g, '/')}` : '',
  };
};
