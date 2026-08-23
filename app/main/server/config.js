// 设置的唯一定义处:每个字段归谁存、什么类型、默认值、改完要不要重启,都在 SPEC 里。
// 设置页直接照 SPEC 渲染,所以界面和后端不会各说各话。
//
// **设置页只有一个源:数据库。** `source: 'settings'` 的字段全部住在
// var/aios.db 的 settings 表,改完立即生效、跨版本共享、回滚版本不丢。
//
// 另外十个字段(端口、boot 超时与退避、guard 与工具注册表路径)标着 `group: null` ——
// 它们**在 App 存在之前就要被读**,天然只能来自文件,所以不进设置页,也不该进。
// 混合来源的设置页是有毒的:同一个页面上有的改完立即生效、有的要重启,
// 有的能「恢复默认」、有的不能,而界面上看不出区别。
//
// 加新字段时的判据只有一句:**App 起来之后才需要它吗?** 是 → settings(进设置页);
// 否 → 文件,并且 group: null。
import fs from 'node:fs';
import * as settingsRepo from './repository/settings.js';
import { ENV_FILE, LIMITS_FILE, readEnv, readLimits } from '../../../host.js';

export const GROUPS = [
  { id: 'model', title: '模型' },
  { id: 'context', title: '上下文' },
  { id: 'compaction', title: '压缩' },
  { id: 'execution', title: '执行' },
];

// type: string | secret | number | ratio | text
export const SPEC = {
  responsesUrl: { group: 'model', source: 'settings', type: 'string', default: '',
    label: 'Responses URL', description: '完整的 Responses API 地址' },
  apiKey: { group: 'model', source: 'settings', type: 'secret', default: '',
    label: 'API Key', description: '模型服务密钥' },
  model: { group: 'model', source: 'settings', type: 'string', default: '',
    label: 'Model', description: '模型名称' },

  contextWindowTokens: { group: 'context', source: 'settings', type: 'number', default: 128_000,
    label: '上下文窗口', description: '模型窗口(tokens)。状态行水位的分母,也是压缩阈值的基数' },
  priceInputPerMTokens: { group: 'context', source: 'settings', type: 'money', default: 0,
    label: '输入价格', description: '币种/百万 tokens。和输出价都为 0 时不显示花费' },
  priceCachedPerMTokens: { group: 'context', source: 'settings', type: 'money', default: 0,
    label: '缓存命中价格', description: '0 = 不打折,按输入价算' },
  priceOutputPerMTokens: { group: 'context', source: 'settings', type: 'money', default: 0,
    label: '输出价格', description: '币种/百万 tokens' },
  priceCurrency: { group: 'context', source: 'settings', type: 'string', default: '¥',
    label: '币种符号', description: '花费显示用' },

  compactFoldRatio: { group: 'compaction', source: 'settings', type: 'ratio', default: 0.8,
    label: '折叠水位', description: '水位到窗口的这个比例时,把一大片历史压成摘要' },
  compactForceRatio: { group: 'compaction', source: 'settings', type: 'ratio', default: 0.95,
    label: '强制水位', description: '到这里不再重试摘要,失败立刻机械折叠。必定释放窗口' },
  compactTailKeepChars: { group: 'compaction', source: 'settings', type: 'number', default: 200_000,
    label: '现场尾巴预算', description: '折叠时保留在原样区的字符数,越大留的现场越多' },
  compactUserKeepMaxChars: { group: 'compaction', source: 'settings', type: 'number', default: 6_000,
    label: '用户原话保留上限', description: '折叠区里不超过此长度的用户消息逐字保留,超过的交给摘要' },
  compactSummaryTimeoutMs: { group: 'compaction', source: 'settings', type: 'number', default: 90_000,
    label: '摘要超时', description: '单次摘要请求的上限(ms),超时算一次失败' },
  compactionPrompt: { group: 'compaction', source: 'settings', type: 'text', default: '',
    label: '压缩提示词', description: '留空用内置提示词。摘要合不合格另有验收,写坏了会退化成机械折叠' },

  workdir: { group: 'execution', source: 'settings', type: 'string', default: '',
    label: '工作目录', description: 'bash 的默认 cwd。留空为系统根' },
  bashMinTimeoutMs: { group: 'execution', source: 'settings', type: 'number', default: 1_000,
    label: 'bash 最小超时', description: 'ms' },
  bashDefaultTimeoutMs: { group: 'execution', source: 'settings', type: 'number', default: 30_000,
    label: 'bash 默认超时', description: 'ms。agent 可按调用传 timeout_ms 覆盖' },
  bashTimeoutMs: { group: 'execution', source: 'settings', type: 'number', default: 600_000,
    label: 'bash 最大超时', description: 'ms' },
  toolTimeoutMs: { group: 'execution', source: 'settings', type: 'number', default: 600_000,
    label: '工具超时', description: '外挂工具的执行上限(ms)' },
  toolOutputMaxChars: { group: 'execution', source: 'settings', type: 'number', default: 50_000,
    label: '工具输出上限', description: 'stdout/stderr 单流最大字符数' },
  guardTimeoutMs: { group: 'execution', source: 'settings', type: 'number', default: 5_000,
    label: 'guard 超时', description: '咨询 guard 的上限(ms)' },
  eventBufferSize: { group: 'execution', source: 'settings', type: 'number', default: 1_000,
    label: '事件缓冲', description: 'App 保留的 SSE 事件数,断线重连靠它补发' },

  // ── 下面这些 group 是 null:**只走配置文件,不进设置页** ──────────────
  //
  // 端口是宿主级的东西 —— Rust 在任何 Node 进程起来之前就要用它启动、
  // 并把窗口指过去。设置页改了端口,宿主还盯着旧的,当场就断。
  // boot 的超时、退避、回落次数同理:它们在 App 起来之前就已经生效了,
  // 一个由 App 提供的界面没资格改它们。
  //
  // 要改就改数据目录里的 env.json / limits.json,改完重启 —— 那才是它们的归属。
  kernelPort: { group: null, source: 'env', type: 'number', default: 9522,
    label: 'Kernel 端口', description: 'Boot 在进程起来之前就要读它' },
  appPort: { group: null, source: 'env', type: 'number', default: 9523,
    label: 'App 端口', description: 'App API 与界面' },
  bootReadyTimeoutMs: { group: null, source: 'env', type: 'number', default: 15_000,
    label: '就绪等待', description: 'Boot 等 Kernel 起来的上限(ms)' },
  bootBackoffMaxMs: { group: null, source: 'env', type: 'number', default: 60_000,
    label: '重启退避上限', description: 'ms。稳定运行超过它之后退避重置' },
  bootFallbackAfter: { group: null, source: 'env', type: 'number', default: 3,
    label: '回落阈值', description: '新版本连续启动失败多少次后退回 backup' },
  shutdownTimeoutMs: { group: null, source: 'env', type: 'number', default: 5_000,
    label: '关闭等待', description: '强杀之前给子进程的时间(ms)' },
  guard: { group: null, source: 'limits', type: 'string', default: 'bin/hooks/guard',
    label: 'guard 路径', description: '相对版本目录。指向版本内的可执行文件,换版本要跟着换' },
  tools: { group: null, source: 'limits', type: 'string', default: 'etc/tools.json',
    label: '工具注册表', description: '相对版本目录' },
  requestBodyMaxBytes: { group: null, source: 'limits', type: 'number', default: 26_214_400,
    label: '请求体上限', description: 'bytes' },
  sseEventMaxBytes: { group: null, source: 'limits', type: 'number', default: 1_048_576,
    label: 'SSE 事件上限', description: 'bytes' },
};

export const KEYS = Object.keys(SPEC);
// 随 run 下发给 Kernel 的键:改完下一轮生效,不必重启内核。
export const RUN_OPTION_KEYS = [
  'model', 'workdir', 'bashMinTimeoutMs', 'bashDefaultTimeoutMs', 'bashTimeoutMs',
  'toolTimeoutMs', 'toolOutputMaxChars', 'guardTimeoutMs',
];

const restartRequired = (key) => SPEC[key].source !== 'settings';

function validate(key, value) {
  const spec = SPEC[key];
  if (!spec) throw new Error(`未知配置项: ${key}`);
  if (spec.type === 'number') {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${key} 必须是非负整数`);
    if ((key === 'kernelPort' || key === 'appPort') && (value < 1 || value > 65535)) {
      throw new Error(`${key} 必须在 1–65535 之间`);
    }
  } else if (spec.type === 'money') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${key} 必须是非负数`);
  } else if (spec.type === 'ratio') {
    if (typeof value !== 'number' || !(value > 0) || value > 1) throw new Error(`${key} 必须是 0–1 之间的小数`);
  } else if (typeof value !== 'string') {
    throw new Error(`${key} 必须是字符串`);
  }
  return value;
}

let cache = null;
export function invalidate() { cache = null; }

/** 三处合并成一个视图。缺的取默认值,所以文件里只留被显式设过的键。 */
export function getConfig() {
  if (cache) return cache;
  const env = readEnv() ?? {};
  const limits = readLimits();
  const settings = settingsRepo.allSettings();
  const stored = { env, limits, settings };
  const merged = {};
  for (const [key, spec] of Object.entries(SPEC)) {
    const value = stored[spec.source][key];
    merged[key] = value === undefined ? spec.default : value;
  }
  cache = merged;
  return merged;
}

export function runOptions() {
  const config = getConfig();
  return Object.fromEntries(RUN_OPTION_KEYS.map((key) => [key, config[key]]));
}

const CRED_KEYS = ['responsesUrl', 'apiKey', 'model'];

/** 当前模型凭据,发 run / complete 时随请求传给内核 —— 内核不碰库,由 App 把源交过去。 */
export function liveCreds() {
  const config = getConfig();
  return { responsesUrl: config.responsesUrl, apiKey: config.apiKey, model: config.model };
}

/**
 * 首启时把默认值写进库。
 *
 * **库原本只存「被改过的键」**,于是「库里没有」和「用默认」两件事混在一起,
 * 谁想读当前值都得先知道 SPEC 才算得出来。预置之后库本身就是完整的当前状态,
 * getConfig() 一次合并就拿到全部当前值(凭据由此经 liveCreds 传给内核)。
 *
 * 只在键不存在时写,所以它不会覆盖用户改过的值,重复调用也安全。
 */
export function seedDefaults() {
  const existing = settingsRepo.allSettings();
  for (const key of KEYS) {
    if (SPEC[key].source !== 'settings') continue;
    if (key in existing) continue;
    settingsRepo.writeSetting(key, SPEC[key].default);
  }
}

/** 设置页的全部信息:分组、字段、当前值、默认值、来源、要不要重启。 */
/** 落库算成本时的单价快照。与 messages 一起写死,所以改价不影响历史。 */
export function pricing() {
  const c = getConfig();
  return {
    input: Number(c.priceInputPerMTokens) || 0,
    cached: Number(c.priceCachedPerMTokens) || 0,
    output: Number(c.priceOutputPerMTokens) || 0,
    currency: String(c.priceCurrency || ''),
    model: String(c.model || ''),
  };
}

export function publicSchema() {
  const config = getConfig();
  const settings = settingsRepo.allSettings();
  return {
    values: config,
    groups: GROUPS.map((group) => ({
      ...group,
      fields: KEYS.filter((key) => SPEC[key].group === group.id).map((key) => {
        const spec = SPEC[key];
        return {
          key,
          label: spec.label,
          description: spec.description,
          type: spec.type,
          source: spec.source,
          restartRequired: restartRequired(key),
          value: config[key],
          default: spec.default,
          // 和默认值比,**不看键在不在库里** —— 默认值已经预置进库,
          // 按「在不在」判会让每个字段都显示成改过的
          changed: config[key] !== spec.default,
        };
      }),
    })),
  };
}

function writeJson(file, obj, mode) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, mode ? { mode } : undefined);
  fs.renameSync(tmp, file);
}

/**
 * 按归属分流写入。settings 传 null 表示恢复默认(删掉那一行)。
 * 返回这次改动是否需要重启才生效。
 */
export function updateConfig(changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('配置必须是对象');
  const routed = { env: {}, limits: {}, settings: {} };
  const reset = [];
  let restart = false;

  for (const [key, value] of Object.entries(changes)) {
    const spec = SPEC[key];
    if (!spec) throw new Error(`未知配置项: ${key}`);
    if (value === null) {
      if (spec.source !== 'settings') throw new Error(`${key} 不在 settings 里,不能恢复默认`);
      reset.push(key);
      continue;
    }
    routed[spec.source][key] = validate(key, value);
    if (restartRequired(key)) restart = true;
  }

  if (Object.keys(routed.env).length) {
    writeJson(ENV_FILE, { ...(readEnv() ?? {}), ...routed.env }, 0o600);
  }
  if (Object.keys(routed.limits).length) {
    writeJson(LIMITS_FILE, { ...readLimits(), ...routed.limits });
  }
  for (const [key, value] of Object.entries(routed.settings)) settingsRepo.writeSetting(key, value);
  for (const key of reset) settingsRepo.clearSetting(key);

  invalidate();

  // 凭据的源是库,但同时镜像一份进 env.json。**唯一目的**:App 挂了、浏览器直连内核自愈时,
  // 没有 App 传参,内核只能从自己的环境(env.json)兜底。库仍是真相,这份只是影子。
  if (CRED_KEYS.some((k) => k in routed.settings || reset.includes(k))) {
    const c = getConfig();
    writeJson(ENV_FILE, { ...(readEnv() ?? {}), responsesUrl: c.responsesUrl, apiKey: c.apiKey, model: c.model }, 0o600);
  }

  return { restartRequired: restart };
}
