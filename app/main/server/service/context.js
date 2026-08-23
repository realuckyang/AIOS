// App 选择跨轮上下文；Kernel 只持有一次 run 期间的工作集。
//
// 模型服务要求 function_call 的下一项就是它的 function_call_output。
// 但 mid-run 到达的消息会按到达顺序拿到两者之间的 seq(比如工具还在 sleep,
// worker 的回传已经写进来了),按 seq 原样重建就会被拒。所以这里成对相邻输出,
// 被插队的消息顺延到这一对之后;无输出的调用与孤儿输出(run 中途停掉、
// context_start 截断留下的残迹)整对丢弃。
function normalize(rows) {
  const items = rows.map((row) => row.item).filter((i) => i && typeof i === 'object');
  const outputByCall = new Map(items.filter((i) => i.type === 'function_call_output').map((i) => [i.call_id, i]));
  const result = [];
  for (const item of items) {
    // 思考过程要跟着历史原样回传:部分网关(thinking mode)强制校验
    // reasoning_text 必须原样带回,丢弃会被拒;顺序天然紧跟在它对应的输出项之前。
    if (item.type === 'function_call') {
      const output = outputByCall.get(item.call_id);
      if (output) result.push(item, output);
      continue;
    }
    if (item.type === 'function_call_output') continue; // 已随调用成对发出,或是孤儿
    result.push(item);
  }
  // status 和 item 级 id 都是上一家模型服务的产物:Responses 输入不需要它们,
  // 换服务后旧 id 格式还会被新网关 400(call_id 是配对语义,保留)
  return result.map(({ status, id, ...item }) => item);
}

export function itemText(item) {
  const content = item?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
  return '';
}

export const systemItem = (text) => ({ type: 'message', role: 'system', content: [{ type: 'input_text', text }] });
export const userItem = (text) => ({ type: 'message', role: 'user', content: [{ type: 'input_text', text }] });



/**
 * 历史按 seq 分两段,界线确定、可重复,所以每一轮组装出的前缀都一模一样,缓存不失效:
 *   折叠区  seq <= 最后一条 compaction 的 end_seq:小型用户原话逐字保留 + 摘要
 *   现场    seq >  它:原样
 * context_start 是人/agent 的手动截断,永远优先于折叠:被它切掉的东西连摘要都不进。
 */
export function buildRunRequest({ meta, rows, compactions = [], appApiBase, userKeepMaxChars = 6_000 }) {
  const start = meta.context_start || 0;
  const usable = compactions.filter((row) => row.start_seq > start);
  const foldEnd = usable.length ? Number(usable.at(-1).end_seq) : 0;

  const folded = [];
  if (usable.length) {
    // 用户原话是确定性的事实底座,摘要不是唯一真相源:模型摘错了,原话还在。
    const users = rows.filter((row) => row.seq > start && row.seq <= foldEnd
      && row.item?.type === 'message' && row.item.role === 'user');
    let cursor = 0;
    for (const compaction of usable) {
      const end = Number(compaction.end_seq);
      for (; cursor < users.length && users[cursor].seq <= end; cursor++) {
        const text = itemText(users[cursor].item);
        if (text && text.length <= userKeepMaxChars) folded.push(userItem(text));
      }
      folded.push(systemItem(`[早前对话的摘要]\n${compaction.summary}`));
    }
  }

  const visible = rows.filter((row) => row.seq > Math.max(start, foldEnd));
  const lastUsage = [...rows].reverse().find((row) => row.usage)?.usage ?? null;
  return {
    input: [...folded, ...normalize(visible)],
    state: {
      threadId: meta.id,
      latestSeq: rows.length ? rows.at(-1).seq : 0,
      contextStart: start,
      foldEnd,
      lastUsage,
      appApiBase,
    },
  };
}
