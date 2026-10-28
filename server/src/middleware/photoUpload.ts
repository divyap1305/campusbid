import multer from 'multer';
import { RequestHandler } from 'express';

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Upload a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
});

export const parsePhotoUpload: RequestHandler = (req, res, next) => {
  parser.single('photo')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'Image must be 5 MB or smaller.' });
      return;
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid image upload.',
    });
  });
};
