// 拖进 UI 的文件落地:var/files/<hash8>-<净化名>。
// 浏览器拿不到拖拽文件的真实路径,复制一份,换一个 agent 可直接读的本地路径;
// 内容寻址,同一份文件重复拖不重复占地。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { VAR_DIR } from './store.js';

const FILES_DIR = path.join(VAR_DIR, 'files');

export function saveFile(name, buffer) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  // 路径分隔符、空白和控制字符换成 _:路径要经得起直接贴进 bash 命令
  const safe = String(name || 'file').replace(/[/\\:\s\x00-\x1f]/g, '_').slice(-80) || 'file';
  const file = path.join(FILES_DIR, `${hash}-${safe}`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
  return file;
}
