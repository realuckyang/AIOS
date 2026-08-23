// 配置来源与命令行解析。端口来自 etc/env.json;model 与窗口大小优先问 App,
// App 不在就只读读 settings 表 —— 逃生模式下库还读得到。
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ENV_FILE, VAR_DIR } from '../../host.js';

export type Config = {
  appBase: string;
  kernelBase: string;
  model: string;
  contextWindow: number;
  direct: boolean;
};

export type Cli =
  | { mode: 'help' }
  | { mode: 'error'; message: string }
  | { mode: 'run'; prompt: string; direct: boolean; chat: string }
  | { mode: 'tui'; direct: boolean; chat: string };

export const HELP = `aios —— AIOS 的终端界面

  aios                      进入交互界面(新建一个对话)
  aios --chat <id>          接着已有对话聊
  aios run "任务"            跑一次就退出,正文走 stdout
  aios --direct             绕开 App 直连 Kernel(App 坏了时用)

  --direct 模式没有历史、不进库、不压缩,一次一发。
`;

export function parseCli(argv: string[]): Cli {
  let direct = false;
  let chat = '';
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') return { mode: 'help' };
    else if (arg === '--direct') direct = true;
    else if (arg === '--chat') chat = argv[++i] ?? '';
    else words.push(arg);
  }
  if (words[0] === 'run') {
    const prompt = words.slice(1).join(' ').trim();
    if (!prompt) return { mode: 'error', message: 'run 需要一句任务:aios run "任务"' };
    return { mode: 'run', prompt, direct, chat };
  }
  if (words.length) return { mode: 'error', message: `不认识的参数:${words.join(' ')}` };
  return { mode: 'tui', direct, chat };
}

function readEnv(): Record<string, any> {
  try { return JSON.parse(fs.readFileSync(ENV_FILE, 'utf8')); } catch { return {}; }
}

/** App 死着也读得到:settings 表是只读打开的。 */
function readSettings(): Record<string, any> {
  const file = path.join(VAR_DIR, 'aios.db');
  if (!fs.existsSync(file)) return {};
  try {
    const db = new DatabaseSync(file, { readOnly: true });
    const out: Record<string, any> = {};
    for (const row of db.prepare('SELECT key, value FROM settings').all() as any[]) {
      try { out[row.key] = JSON.parse(row.value); } catch { /* 值坏了就当没设置 */ }
    }
    db.close();
    return out;
  } catch { return {}; }
}

export async function loadConfig(direct: boolean): Promise<Config> {
  const env = readEnv();
  const appBase = `http://127.0.0.1:${Number(env.appPort) || 9523}/api`;
  const kernelBase = `http://127.0.0.1:${Number(env.kernelPort) || 9522}/api`;

  let values: Record<string, any> | null = null;
  if (!direct) {
    try {
      const res = await fetch(`${appBase}/config`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) values = ((await res.json()) as { values: Record<string, any> }).values;
    } catch { /* App 不在,下面退回读库 */ }
  }
  const settings = values ?? readSettings();

  return {
    appBase,
    kernelBase,
    model: String(settings.model ?? ''),
    contextWindow: Number(settings.contextWindowTokens) || 128_000,
    direct: direct || values === null,
  };
}
