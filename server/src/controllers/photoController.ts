import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';

const getImageExtension = (buffer: Buffer): string | null => {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
};

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: 'Select an image to upload.' });
    return;
  }

  const extension = getImageExtension(req.file.buffer);
  if (!extension) {
    res.status(400).json({ success: false, message: 'The uploaded file is not a valid JPEG, PNG, or WebP image.' });
    return;
  }

  const uploadsDir = path.resolve('uploads');
  const filename = `${randomUUID()}.${extension}`;
  try {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), req.file.buffer, { flag: 'wx' });
    res.status(201).json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error('[Photo Upload Error]', error);
    res.status(500).json({ success: false, message: 'Failed to save uploaded image.' });
  }
};
