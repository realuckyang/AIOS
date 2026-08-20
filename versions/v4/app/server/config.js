// 设置的唯一定义处:每个字段归谁存、什么类型、默认值、改完要不要重启,都在 SPEC 里。
// 设置页直接照 SPEC 渲染,所以界面和后端不会各说各话。
//
// 三个存放处,判据是「谁在什么时刻读它」:
//   env      etc/env.json —— Boot 在进程存在之前就要读,或属于凭据;Kernel 与 console
//            也要在 App 之外说话,所以模型三件套留在这里
//   limits   versions/<id>/etc/limits.json —— 指向版本目录内的文件,或 Kernel 建
//            HTTP 服务器时就要
//   settings var/aios.db 的 settings 表 —— App 运行时读,或随 run 下发给 Kernel。
//            改完立即生效,不必重启;跨版本共享,回滚版本不丢
import fs from 'node:fs';
import * as store from './store.js';
import { ENV_FILE, LIMITS_FILE, readEnv, readLimits } from '../../host.js';

export const GROUPS = [
  { id: 'model', title: '模型' },
  { id: 'context', title: '上下文' },
  { id: 'compaction', title: '压缩' },
  { id: 'execution', title: '执行' },
  { id: 'service', title: '服务与端口', divider: true },
];

// type: string | secret | number | ratio | text
export const SPEC = {
  responsesUrl: { group: 'model', source: 'env', type: 'string', default: '',
    label: 'Responses URL', description: '完整的 Responses API 地址' },
  apiKey: { group: 'model', source: 'env', type: 'secret', default: '',
    label: 'API Key', description: '模型服务密钥。只存在 0600 的文件里,不进库' },
  model: { group: 'model', source: 'settings', type: 'string', default: '',
    label: 'Model', description: '模型名称。随 run 下发给 Kernel,改完下一轮就生效' },

  contextWindowTokens: { group: 'context', source: 'settings', type: 'number', default: 128_000,
    label: '上下文窗口', description: '模型窗口(tokens)。状态行水位的分母,也是压缩阈值的基数' },
  priceInputPerMTokens: { group: 'context', source: 'settings', type: 'number', default: 0,
    label: '输入价格', description: '币种/百万 tokens。和输出价都为 0 时不显示花费' },
  priceCachedPerMTokens: { group: 'context', source: 'settings', type: 'number', default: 0,
    label: '缓存命中价格', description: '0 = 不打折,按输入价算' },
  priceOutputPerMTokens: { group: 'context', source: 'settings', type: 'number', default: 0,
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

  kernelPort: { group: 'service', source: 'env', type: 'number', default: 9522,
    label: 'Kernel 端口', description: 'Boot 在进程起来之前就要读它' },
  appPort: { group: 'service', source: 'env', type: 'number', default: 9523,
    label: 'App 端口', description: 'App API 与界面' },
  bootReadyTimeoutMs: { group: 'service', source: 'env', type: 'number', default: 15_000,
    label: '就绪等待', description: 'Boot 等 Kernel 起来的上限(ms)' },
  bootBackoffMaxMs: { group: 'service', source: 'env', type: 'number', default: 60_000,
    label: '重启退避上限', description: 'ms。稳定运行超过它之后退避重置' },
  bootFallbackAfter: { group: 'service', source: 'env', type: 'number', default: 3,
    label: '回落阈值', description: '新版本连续启动失败多少次后退回 backup' },
  shutdownTimeoutMs: { group: 'service', source: 'env', type: 'number', default: 5_000,
    label: '关闭等待', description: '强杀之前给子进程的时间(ms)' },
  guard: { group: 'service', source: 'limits', type: 'string', default: 'bin/hooks/guard',
    label: 'guard 路径', description: '相对版本目录。指向版本内的可执行文件,换版本要跟着换' },
  tools: { group: 'service', source: 'limits', type: 'string', default: 'etc/tools.json',
    label: '工具注册表', description: '相对版本目录' },
  requestBodyMaxBytes: { group: 'service', source: 'limits', type: 'number', default: 26_214_400,
    label: '请求体上限', description: 'bytes' },
  sseEventMaxBytes: { group: 'service', source: 'limits', type: 'number', default: 1_048_576,
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
  const settings = store.allSettings();
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

/** 设置页的全部信息:分组、字段、当前值、默认值、来源、要不要重启。 */
export function publicSchema() {
  const config = getConfig();
  const settings = store.allSettings();
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
          changed: spec.source === 'settings' ? key in settings : config[key] !== spec.default,
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
  for (const [key, value] of Object.entries(routed.settings)) store.writeSetting(key, value);
  for (const key of reset) store.clearSetting(key);

  invalidate();
  return { restartRequired: restart };
}
