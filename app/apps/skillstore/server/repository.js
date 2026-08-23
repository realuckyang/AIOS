// Skill Store —— 技能商店的 App 端点做三件事:
//   1) 代理讯飞 skillhub(skill.xfyun.cn)的公开 API,给前端浏览列表/详情
//   2) 把某个技能包(install 返回的 zip)下载并解压到本地 skills/<slug>/
//   3) 汇报「已安装」的本地技能清单,与现有 /api/skills 打通
//
// 只在 App 层实现:纯读取代理 + 本地技能目录写入,不碰 kernel,不碰 var/。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HOME } from '../../../../host.js';
import { execFile } from 'node:child_process';

const API = 'https://skill.xfyun.cn/api/v1';
// skills/ 目录在版本根(与 kernel/ 同级),即本文件(在 app/server/ 下)向上两级
const SKILLS_ROOT = path.join(HOME, 'skills');
const VALID_ID = /^[a-z0-9-]+$/;

// zip slip 防护:解压前把所有条目限制在目标目录内
function assertNoEscape(entries, destRoot) {
  for (const name of entries) {
    const target = path.resolve(destRoot, name);
    if (!target.startsWith(destRoot + path.sep) && target !== destRoot) {
      throw new Error(`技能包内含有非法路径: ${name}`);
    }
  }
}

async function fetchJson(url, timeoutMs = 20_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`上游返回 ${res.status} (${url})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 把 skillhub 列表项压成前端要用的简洁结构
function toSummary(raw) {
  const version = raw.latestVersion || raw.version || {};
  return {
    slug: raw.slug,
    name: raw.displayName || raw.slug,
    summary: raw.summary || '',
    downloads: raw.stats?.downloads || 0,
    stars: raw.stats?.stars || 0,
    updatedAt: raw.updatedAt || 0,
    version: version.version || '',
    license: version.license ?? null,
  };
}

// 移除本地已安装的技能。
export function uninstallSkill(slug) {
  if (!VALID_ID.test(slug)) throw new Error(`非法的技能名: ${slug}`);
  const dest = path.join(SKILLS_ROOT, slug);
  if (!fs.existsSync(dest)) return { ok: false, slug, reason: 'not-installed' };
  fs.rmSync(dest, { recursive: true, force: true });
  return { ok: true, slug };
}

export async function listStoreSkills(cursor) {
  const url = `${API}/skills${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
  const data = await fetchJson(url);
  const items = (data.items || []).map(toSummary);
  return { items, nextCursor: data.nextCursor ?? null };
}

export async function getStoreSkill(slug) {
  const data = await fetchJson(`${API}/skills/${encodeURIComponent(slug)}`);
  const raw = data.skill || {};
  const version = data.latestVersion || {};
  const mod = data.moderation || {};
  return {
    slug: raw.slug,
    name: raw.displayName || raw.slug,
    summary: raw.summary || '',
    stats: raw.stats || {},
    downloads: raw.stats?.downloads || 0,
    stars: raw.stats?.stars || 0,
    updatedAt: raw.updatedAt || 0,
    version: version.version || '',
    license: version.license ?? null,
    owner: data.owner ?? null,
    moderation: mod.verdict || 'unknown',
  };
}

// 已安装在本地 skills/ 里的技能 id 列表(与现有 listSkills 口径一致)
export function listInstalled() {
  try {
    return fs.readdirSync(SKILLS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && VALID_ID.test(e.name) && fs.existsSync(path.join(SKILLS_ROOT, e.name, 'SKILL.md')))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// 下载并解压技能包到本地 skills/<slug>/。
export async function installSkill(slug, { force = false } = {}) {
  if (!VALID_ID.test(slug)) throw new Error(`非法的技能名: ${slug}`);

  const dest = path.join(SKILLS_ROOT, slug);
  if (fs.existsSync(dest)) {
    if (!force) return { ok: false, slug, reason: 'already-installed' };
    fs.rmSync(dest, { recursive: true, force: true });
  }

  // 1) 拿安装信息(下载地址)
  const inst = await fetchJson(`${API}/skills/${encodeURIComponent(slug)}/install`);
  if (!inst?.archive?.downloadUrl) throw new Error('上游未返回下载地址');
  const zipUrl = inst.archive.downloadUrl;

  // 2) 下载 zip 到临时目录
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skillstore-'));
  const zipPath = path.join(tmpRoot, 'bundle.zip');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const res = await fetch(zipUrl, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`下载技能包失败: ${res.status}`);
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  } finally {
    clearTimeout(timer);
  }

  // 3) 解压到一个隔离目录,先列条目校验路径不逃逸,再真解压
  const unpack = path.join(tmpRoot, 'unpack');
  fs.mkdirSync(unpack, { recursive: true });
  await new Promise((resolve, reject) => {
    execFile('unzip', ['-l', zipPath], { encoding: 'utf8' }, (err, stdout) => {
      if (err) return reject(err);
      const names = stdout.split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[a-zA-Z0-9._/-]+$/.test(l))
        .slice(3);               // 跳过 "Archive/Length/Date/Name" 头部
      try { assertNoEscape(names.filter(Boolean), unpack); resolve(); }
      catch (e) { reject(e); }
    });
  });
  await new Promise((resolve, reject) => {
    execFile('unzip', ['-o', zipPath, '-d', unpack], { encoding: 'utf8' }, (err) =>
      err ? reject(err) : resolve());
  });

  // 4) 校验 SKILL.md 存在,再移到最终位置
  if (!fs.existsSync(path.join(unpack, 'SKILL.md'))) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    throw new Error('技能包缺少 SKILL.md,拒绝安装');
  }
  fs.mkdirSync(SKILLS_ROOT, { recursive: true });
  fs.renameSync(unpack, dest);
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  return { ok: true, slug, files: fs.readdirSync(dest) };
}
