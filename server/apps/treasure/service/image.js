import { existsSync, readFileSync } from 'fs';
import { extname } from 'path';
import { getImagePath } from '../repository/image.js';

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

export const fetchImage = (id) => {
  const imagePath = getImagePath(id);
  if (!imagePath || !existsSync(imagePath)) {
    return { error: true, status: 404, message: '图片不存在' };
  }

  const ext = extname(imagePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const buffer = readFileSync(imagePath);
  return { error: false, contentType, buffer };
};
