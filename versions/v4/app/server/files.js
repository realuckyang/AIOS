// 拖进 UI 的文件落地:var/files/<hash8>-<净化名>。
// 浏览器拿不到拖拽文件的真实路径,复制一份,换一个 agent 可直接读的本地路径;
// 内容寻址,同一份文件重复拖不重复占地。
//
// 图片走同一个目录、同一套内容寻址,但**不进 items 库**:库里只存 aios-file:// 引用,
// 字节留盘上。显示时经 GET /api/files/<name> 取回;发模型时才读盘内联成 data URL
// (远程 API 到不了本地,只能带字节)。这样 items 行不再塞几 MB base64。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { VAR_DIR } from './store.js';

const FILES_DIR = path.join(VAR_DIR, 'files');
const REF_PREFIX = 'aios-file://';
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

export function saveFile(name, buffer) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  // 路径分隔符、空白和控制字符换成 _:路径要经得起直接贴进 bash 命令
  const safe = String(name || 'file').replace(/[/\\:\s\x00-\x1f]/g, '_').slice(-80) || 'file';
  const file = path.join(FILES_DIR, `${hash}-${safe}`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
  return file;
}

// 不信浏览器给的 mime:按魔数判定真实图片类型。不支持返回 undefined。
export function sniffImageMime(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return undefined;
}

// 图片字节内容寻址落盘,返回可移植引用 aios-file://<hash8>.<ext>(库里存这个,不是 base64)。
export function saveImage(buffer, mime) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  const ext = MIME_EXT[mime];
  if (!ext) throw new Error(`不支持的图片类型: ${mime}`);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  const base = `${hash}.${ext}`;
  const file = path.join(FILES_DIR, base);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
  return REF_PREFIX + base;
}

export function isFileRef(url) {
  return typeof url === 'string' && url.startsWith(REF_PREFIX);
}

// 引用 → 绝对路径。挡路径穿越:只认纯 basename,且必须落在 FILES_DIR 内。
export function resolveRef(ref) {
  if (!isFileRef(ref)) return null;
  const base = ref.slice(REF_PREFIX.length);
  if (!base || base.includes('/') || base.includes('\\') || base.includes('..')) return null;
  const file = path.join(FILES_DIR, base);
  if (file !== path.join(FILES_DIR, path.basename(file))) return null;
  return fs.existsSync(file) ? file : null;
}

function refMime(ref) {
  return EXT_MIME[ref.slice(ref.lastIndexOf('.') + 1).toLowerCase()] || 'application/octet-stream';
}

// GET /api/files/<basename>:流式吐图,给 UI <img> 用。
export function sendFileRef(res, basename) {
  const ref = REF_PREFIX + String(basename);
  const file = resolveRef(ref);
  if (!file) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not found' }));
  }
  res.writeHead(200, { 'content-type': refMime(ref), 'cache-control': 'public, max-age=31536000, immutable' });
  fs.createReadStream(file).pipe(res);
}

// 发模型前:把 input_image 里的 aios-file:// 引用读盘还原成 data URL。
// 文件不在了就换成一句文本,别让模型对着空引用发懵。
export function inlineImageRefs(items) {
  return items.map((item) => {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) return item;
    const content = item.content.map((part) => {
      if (part?.type !== 'input_image' || !isFileRef(part.image_url)) return part;
      const file = resolveRef(part.image_url);
      if (!file) return { type: 'input_text', text: '[图片缺失]' };
      return { ...part, image_url: `data:${refMime(part.image_url)};base64,${fs.readFileSync(file).toString('base64')}` };
    });
    return { ...item, content };
  });
}
