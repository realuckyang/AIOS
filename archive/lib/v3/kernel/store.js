// data/ 的唯一写者。meta.json 用 temp+rename 保原子,items.jsonl 追加写。
// 读取时跳过损坏行(崩溃最多脏最后一行)。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHATS_DIR = path.join(ROOT, 'data', 'chats');

const seqCache = new Map(); // chatId -> last seq

export function ensureDataDir() {
  fs.mkdirSync(CHATS_DIR, { recursive: true });
}

function chatDir(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`非法 chat id: ${id}`);
  return path.join(CHATS_DIR, id);
}

function metaPath(id) { return path.join(chatDir(id), 'meta.json'); }
function itemsPath(id) { return path.join(chatDir(id), 'items.jsonl'); }

function writeMeta(id, meta) {
  const tmp = metaPath(id) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2) + '\n');
  fs.renameSync(tmp, metaPath(id));
}

export function createChat({ title = '', description = '' } = {}) {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  fs.mkdirSync(chatDir(id), { recursive: true });
  const meta = { id, title, description, context_start: 0, created_at: now, updated_at: now };
  writeMeta(id, meta);
  fs.writeFileSync(itemsPath(id), '');
  seqCache.set(id, 0);
  return meta;
}

export function getChat(id) {
  try {
    return JSON.parse(fs.readFileSync(metaPath(id), 'utf8'));
  } catch {
    return null;
  }
}

export function listChats() {
  ensureDataDir();
  const out = [];
  for (const id of fs.readdirSync(CHATS_DIR)) {
    const meta = getChat(id);
    if (meta) out.push(meta);
  }
  out.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return out;
}

export function updateChat(id, changes) {
  const meta = getChat(id);
  if (!meta) return null;
  for (const key of ['title', 'description', 'context_start']) {
    if (changes[key] !== undefined) meta[key] = changes[key];
  }
  meta.updated_at = new Date().toISOString();
  writeMeta(id, meta);
  return meta;
}

export function removeChat(id) {
  if (!getChat(id)) return false;
  fs.rmSync(chatDir(id), { recursive: true, force: true });
  seqCache.delete(id);
  return true;
}

export function readItems(id, { afterSeq = 0 } = {}) {
  let raw;
  try {
    raw = fs.readFileSync(itemsPath(id), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.seq > afterSeq) out.push(row);
    } catch {
      // 崩溃残留的脏行,跳过
    }
  }
  return out;
}

function lastSeq(id) {
  if (seqCache.has(id)) return seqCache.get(id);
  const rows = readItems(id);
  const seq = rows.length ? rows[rows.length - 1].seq : 0;
  seqCache.set(id, seq);
  return seq;
}

const SOURCES = new Set(['user', 'runtime', 'model', 'tool']);

export function appendItem(id, { source, item, usage }) {
  if (!SOURCES.has(source)) throw new Error(`非法 source: ${source}`);
  if (!getChat(id)) throw new Error(`对话不存在: ${id}`);
  const seq = lastSeq(id) + 1;
  const row = { seq, source, item, at: new Date().toISOString() };
  if (usage) row.usage = usage;
  fs.appendFileSync(itemsPath(id), JSON.stringify(row) + '\n');
  seqCache.set(id, seq);
  const meta = getChat(id);
  meta.updated_at = row.at;
  writeMeta(id, meta);
  return row;
}
