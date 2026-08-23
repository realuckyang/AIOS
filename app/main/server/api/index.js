// API 总装。框架路由写死在这里,应用路由靠扫目录发现 —— 新建一个应用目录即上架,
// 不用改本文件。应用拿到的 ctx 里没有任何框架仓库的句柄,只有请求本身和配置。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { json, readBody } from '../../../shared/http.js';
import * as events from '../events.js';
import { getConfig, publicSchema, updateConfig } from '../config.js';
import { saveFile, sendFileRef } from '../files.js';
import * as chatsApi from './chats.js';
import * as tasksApi from './tasks.js';
import * as usageApi from './usage.js';
import * as systemApi from './system.js';

const APPS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps');

// 框架自己的路由。chat 与 task 是框架能力的官方界面,不是应用。
const FRAMEWORK = new Map([chatsApi, tasksApi, usageApi, systemApi].map((m) => [m.prefix, m]));

// 应用路由:扫 apps/<id>/server/api.js。下划线开头的是共享设施,不是应用。
async function loadApps() {
  const mounted = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(APPS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'));
  } catch { return mounted; }

  for (const entry of entries) {
    const file = path.join(APPS_DIR, entry.name, 'server', 'api.js');
    if (!fs.existsSync(file)) continue;   // 只有界面、没有服务端的应用是合法的
    try {
      const mod = await import(`file://${file}`);
      if (typeof mod.handle !== 'function' || !mod.prefix) {
        console.warn(`[app] ${entry.name}: server/api.js 需要导出 prefix 与 handle`);
        continue;
      }
      if (FRAMEWORK.has(mod.prefix)) {
        console.warn(`[app] ${entry.name}: 前缀 ${mod.prefix} 与框架路由冲突,跳过`);
        continue;
      }
      mounted.set(mod.prefix, { id: entry.name, handle: mod.handle });
    } catch (err) {
      console.warn(`[app] ${entry.name} 挂载失败: ${err?.message ?? err}`);
    }
  }
  return mounted;
}

const apps = await loadApps();
if (apps.size) console.log(`[app] 已挂载应用: ${[...apps.values()].map((a) => a.id).join(' · ')}`);

export async function handleApi(req, res, { kernelPort, appPort, health, canRestartApp, requestAppRestart }) {
  // 每次请求现取:settings 改完立即生效,不必重启 App
  const config = getConfig();
  const url = new URL(req.url, 'http://127.0.0.1');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return false;

  const ctx = { req, res, parts, url, config, kernelPort, appPort, canRestartApp, requestAppRestart };

  try {
    if (parts[1] === 'health' && req.method === 'GET') {
      json(res, 200, health);
      return true;
    }

    if (parts[1] === 'events' && req.method === 'GET') {
      events.subscribe(req, res);
      return true;
    }

    if (parts[1] === 'config' && parts.length === 2) {
      if (req.method === 'GET') {
        json(res, 200, publicSchema());
      } else if (req.method === 'PATCH') {
        const body = await readBody(req, config.requestBodyMaxBytes);
        const { restartRequired } = updateConfig(body);
        events.configure(getConfig());
        json(res, 200, { ...publicSchema(), restartRequired });
      } else {
        json(res, 405, { error: 'method not allowed' });
      }
      return true;
    }

    // 拖/选进来的非图片文件:内容落 var/files,换回本地路径给消息文本引用
    if (parts[1] === 'files' && parts.length === 2 && req.method === 'POST') {
      const body = await readBody(req, config.requestBodyMaxBytes);
      const match = /^data:[^;,]*;base64,(.+)$/s.exec(String(body.data ?? ''));
      if (!match) json(res, 400, { error: 'data 必须是 base64 data URL' });
      else json(res, 201, { path: saveFile(body.name, Buffer.from(match[1], 'base64')) });
      return true;
    }

    // 图片引用取回:GET /api/files/<basename>,给 UI <img> 用
    if (parts[1] === 'files' && parts.length === 3 && req.method === 'GET') {
      sendFileRef(res, decodeURIComponent(parts[2]));
      return true;
    }

    const framework = FRAMEWORK.get(parts[1]);
    if (framework) {
      await framework.handle(ctx);
      return true;
    }

    const app = apps.get(parts[1]);
    if (app) {
      await app.handle(ctx);
      return true;
    }

    json(res, 404, { error: 'not found' });
    return true;
  } catch (err) {
    json(res, 500, { error: String(err?.message ?? err) });
    return true;
  }
}
