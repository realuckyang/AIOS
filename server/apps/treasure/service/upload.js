import { mkdir, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../../../..');
const UPLOAD_DIR = join(ROOT, 'files', 'uploads', 'treasure');
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const safeName = (name = 'image') =>
  String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'image';

export const handleUpload = async (body = {}) => {
  const fileName = String(body.name || '').trim();
  const base64 = String(body.data || '').trim();
  if (!fileName || !base64) return { status: 400, message: 'name and data are required' };

  const ext = extname(fileName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { status: 400, message: `file type not allowed: ${ext || '(none)'}` };

  let buffer;
  try {
    const normalized = base64.replace(/^data:.*;base64,/, '');
    buffer = Buffer.from(normalized, 'base64');
  } catch {
    return { status: 400, message: 'invalid base64 data' };
  }

  if (!buffer || buffer.length === 0) return { status: 400, message: 'empty image data' };
  if (buffer.length > MAX_SIZE) return { status: 400, message: 'image too large (max 8MB)' };

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const savedName = `${ts}-${rand}-${safeName(fileName)}`;
  const absPath = join(UPLOAD_DIR, savedName);

  await writeFile(absPath, buffer);

  return {
    success: true,
    image: {
      name: fileName,
      path: absPath,
      size: buffer.length
    }
  };
};
