// 上下文水位维护:到水位才折叠,一次折一大片,compaction 只追加不重写。
//
// 为什么不每轮渐进压缩:缓存命中价远低于未命中,前缀稳定时长历史的常驻成本很低,
// 而每改写一次历史就是一次全量 cache miss。所以清理攒到水位一批做完。
//
// 折叠发生在两次 run 之间——工具循环在 Kernel 内,App 插不进去。单个 run 内部爆窗
// 仍要靠 agent 自己按状态行的水位收敛。
import * as store from './store.js';
import { itemText, userItem } from './context.js';
import { liveCreds } from './config.js';

// 水位、预算与提示词都在设置里(压缩那一页),这里只留摘要素材的裁剪常量。
const CALL_ARGS_MAX_CHARS = 2_000;       // 摘要素材里单条工具调用参数的上限
const CALL_OUTPUT_MAX_CHARS = 4_000;     // 摘要素材里单条工具结果的上限

export const DEFAULT_COMPACTION_PROMPT = [
  '你在压缩一段对话,让它能被无缝接着往下做。',
  '输出一段连续的中文摘要,覆盖:用户提出的目标与约束、已经做完的事、',
  '得到的关键事实(路径、命令、接口、数字、结论)、尚未完成的部分和下一步。',
  '保留具体值,不要写「讨论了若干配置」这种空话。',
  '只输出摘要正文:不要工具调用,不要标签,不要代码围栏。',
].join('\n');

const clip = (text, max) => {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max)}\n…(截断,共 ${value.length} 字符)`;
};

const itemChars = (item) => {
  try { return JSON.stringify(item).length; } catch { return 0; }
};

/** 水位口径与状态行一致:最近一次请求的 input+output。 */
export function watermark(rows) {
  const usage = [...rows].reverse().find((row) => row.usage)?.usage ?? null;
  if (!usage) return 0;
  return (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0);
}

/** 尾巴预算:从末尾往前按字符累计,返回尾巴开始的下标。至少留两条。 */
function tailStartIndex(rows, tailKeepChars) {
  let start = rows.length;
  let chars = 0;
  while (start > 0 && (chars < tailKeepChars || rows.length - start < 2)) {
    start -= 1;
    chars += itemChars(rows[start].item);
  }
  return start;
}

/**
 * 折叠的合法切点:尾巴不能从无主的工具结果开始,否则模型服务会拒绝这次输入。
 * 切点落在一组调用的结果中间时,把整组调用连同结果一起留给尾巴。
 */
function legalFoldSplit(rows, tailAt) {
  let at = tailAt;
  while (at > 0 && rows[at].item?.type === 'function_call_output') at -= 1;
  while (at > 0 && rows[at - 1].item?.type === 'function_call') at -= 1;
  return at;
}

function serializeForSummary(slice) {
  return slice.map(({ seq, item }) => {
    if (item?.type === 'function_call') {
      return `#${seq} function_call ${item.name}\n${clip(item.arguments, CALL_ARGS_MAX_CHARS)}`;
    }
    if (item?.type === 'function_call_output') {
      return `#${seq} function_call_output\n${clip(item.output, CALL_OUTPUT_MAX_CHARS)}`;
    }
    if (item?.type === 'reasoning') return null; // 体积大、密度低,不进摘要素材
    return `#${seq} ${item?.role || item?.type || 'unknown'}\n${itemText(item)}`;
  }).filter(Boolean).join('\n\n---\n\n');
}

/**
 * 摘要合格吗。
 *
 * 素材里全是工具调用时,模型很容易照着那个模式往下写,把调用标记当正文吐出来;
 * 照单全收会让整条链被一段乱码顶掉,那个对话从此忘了自己在干什么。
 * 所以认两件事:不能是工具调用的标记文本,也不能短得不像话——压掉上百条却只憋出两行,
 * 多半是跑偏了而不是真没内容。
 */
export function acceptableSummary(text) {
  const summary = String(text || '').trim();
  if (summary.length < 80) return false;
  if (/(?:DSML|<\s*\/?\s*(?:invoke|tool_calls?|function_calls?)\b)/i.test(summary)) return false;
  return true;
}

/** 摘要失败时释放窗口的确定性出口:不调模型,必定成功。 */
export function mechanicalSummary(slice, appApiBase) {
  const lines = slice.map(({ seq, item }) => {
    const label = item?.type === 'message' ? item.role : item?.type;
    const head = (item?.type === 'function_call' ? `${item.name} ${item.arguments || ''}` : itemText(item))
      .replace(/\s+/g, ' ').trim().slice(0, 120);
    return `#${seq} ${label} ${head}`;
  });
  return ['[机械折叠] 模型摘要不可用,以下是这一段的确定性索引。原文仍在库里,取用:',
    `  curl -s '${appApiBase}/chats/<chat>/items?after=<seq-1>&limit=1'`,
    ...lines].join('\n');
}

async function summarize({ kernelPort, material, strict, prompt, timeoutMs, model }) {
  const base = String(prompt || '').trim() || DEFAULT_COMPACTION_PROMPT;
  const instructions = strict ? `${base}\n\n再说一次:只输出摘要正文本身。` : base;
  const res = await fetch(`http://127.0.0.1:${kernelPort}/api/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, instructions, input: [userItem(material)], creds: liveCreds() }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Kernel ${res.status}`);
  return res.json();
}

/**
 * 卡死保护(进程内即可,重启后再试一次无妨):同一片素材连折两次仍降不到水位下,
 * 或水位超了却已无可折叠素材——说明近期消息本身就太大,再压是白烧钱。
 */
const foldStreak = new Map(); // chatId → { count, endSeq, warned }

/**
 * 水位维护。返回是否产生了新的 compaction(调用方据此决定要不要重新组装)。
 * 任何失败都只是「这次不折」,不该让 run 挂掉。
 */
export async function maintainContext(chatId, { kernelPort, appApiBase, config }) {
  const window = Number(config.contextWindowTokens) || 0;
  if (!(window > 0)) return false;

  const meta = store.getChat(chatId);
  if (!meta) return false;
  const rows = store.readItems(chatId);
  const tokens = watermark(rows);
  if (tokens < Math.round(window * config.compactFoldRatio)) {
    foldStreak.delete(chatId);
    return false;
  }

  const start = meta.context_start || 0;
  const compactions = store.allCompactions(chatId).filter((row) => row.start_seq > start);
  const floor = Math.max(start, compactions.length ? Number(compactions.at(-1).end_seq) : 0);
  const pending = rows.filter((row) => row.seq > floor);

  const forced = tokens >= Math.round(window * config.compactForceRatio);
  const keepAt = legalFoldSplit(pending, tailStartIndex(pending, config.compactTailKeepChars));
  const endSeq = keepAt > 0 ? pending[keepAt - 1].seq : 0;
  const streak = foldStreak.get(chatId) || { count: 0, endSeq: 0, warned: false };
  const blocked = streak.count >= 2 && endSeq <= streak.endSeq;

  if (keepAt < (forced ? 1 : 3) || blocked) {
    if (!streak.warned) {
      console.warn(`[app] ${chatId} 水位 ${tokens}/${window} 但已无可折叠素材,暂停折叠`);
      foldStreak.set(chatId, { ...streak, warned: true });
    }
    return false;
  }

  const slice = pending.slice(0, keepAt);
  const startSeq = slice[0].seq;
  let summary = '';
  let kind = 'summary';
  let tokensUsed = 0;

  const material = `压缩下面这段对话:\n\n${serializeForSummary(slice)}`;
  for (let attempt = 0; attempt < (forced ? 1 : 2); attempt++) {
    try {
      const result = await summarize({
        kernelPort,
        material,
        strict: attempt > 0,
        prompt: config.compactionPrompt,
        timeoutMs: config.compactSummaryTimeoutMs,
        model: config.model,
      });
      tokensUsed = (Number(result?.usage?.input_tokens) || 0) + (Number(result?.usage?.output_tokens) || 0);
      if (acceptableSummary(result?.text)) { summary = String(result.text).trim(); break; }
    } catch { /* 超时或 API 错误:算一次失败,走下一次尝试或机械折叠 */ }
  }
  if (!summary) {
    summary = mechanicalSummary(slice, appApiBase);
    kind = 'mechanical';
  }

  store.insertCompaction(chatId, { startSeq, endSeq, summary, kind, tokens: tokensUsed });
  foldStreak.set(chatId, { count: streak.count + 1, endSeq, warned: false });
  console.log(`[app] ${chatId} 折叠 seq ${startSeq}–${endSeq}(${kind},水位 ${tokens}/${window})`);
  return true;
}
