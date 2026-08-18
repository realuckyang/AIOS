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
    // 思考过程不跨轮回传:轮内配对由 Kernel 的内存工作集负责,
    // 跨轮带上只会撞各家网关对 reasoning 回显格式的私有校验
    if (item.type === 'reasoning') continue;
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

export function buildRunRequest({ meta, rows, appApiBase }) {
  const visible = rows.filter((row) => row.seq > (meta.context_start || 0));
  const lastUsage = [...rows].reverse().find((row) => row.usage)?.usage ?? null;
  return {
    input: normalize(visible),
    state: {
      chatId: meta.id,
      latestSeq: rows.length ? rows.at(-1).seq : 0,
      contextStart: meta.context_start || 0,
      lastUsage,
      appApiBase,
    },
  };
}
