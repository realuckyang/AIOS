import { runAgent } from '../../agent/index.js';
import { compact } from '../../agent/compaction.js';
import { buildContext } from '../../agent/context.js';
import { TOOLS } from '../../agent/tools.js';
import { calls, chats, compactions, items } from '../../repository/index.js';
import { publish } from '../events/index.js';
import { runtimeSettings } from '../settings/index.js';
import { setError } from './errors.js';

const renderPrompt = (text, values) => Object.entries(values).reduce(
  (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)), text,
);

const callProtocol = ({ chatId, apiUrl }) => `

对话归属规则（必须遵守）：
- 你代表当前对话执行任务。需要创建或调用另一条执行对话时，只能使用 POST ${apiUrl}/api/chats/${chatId}/calls。
- 请求体至少包含 message，可选 title、description、context 或 toChatId。该接口会建立调用关系，并让目标出现在当前对话的“执行对话”面板。
- 不要使用 POST ${apiUrl}/api/chats 创建派生对话；该接口仅供用户从界面创建顶层对话，创建结果会出现在左侧列表。
- 调用接口会立即返回，不要轮询；目标完成后，结果会自动回传到当前对话。`;

function saveEvent(chatId, event) {
  if (event.delta !== undefined) { publish({ chatId, ...event }); return; }
  if (event.item) {
    const row = items.add(chatId, event.item, { source: 'model', usage: event.usage });
    publish({ chatId, ...event, itemId: row.id, item: row.item, source: row.source });
    return;
  }
  if (event.items) {
    const source = event.type === 'tool_results' ? 'tool' : 'model';
    const rows = event.items.map((item, index) => items.add(
      chatId, item, {
        source,
        usage: index === event.items.length - 1 ? event.usage : null,
      },
    ));
    publish({
      chatId, ...event,
      items: rows.map((row) => ({ itemId: row.id, item: row.item, source: row.source })),
    });
  }
}

export async function execute(chat, controller) {
  const runtime = runtimeSettings();
  const apiUrl = `http://127.0.0.1:${Number(process.env.PORT) || 9522}`;
  const instructions = renderPrompt(runtime.prompt.chat, { chat_id: chat.id, api_url: apiUrl })
    + callProtocol({ chatId: chat.id, apiUrl });
  let lastText = '';
  let ending = 'completed';
  try {
    const result = await runAgent({
      instructions,
      tools: TOOLS,
      input: buildContext({
        items: items.listByChat(chat.id),
        compactions: compactions.listByChat(chat.id),
        liveResultChars: runtime.context.liveResultChars,
      }).input,
      cwd: process.cwd(),
      signal: controller.signal,
      config: runtime.llm,
      env: {
        AGENT_CHAT_ID: chat.id,
        AGENT_API_URL: apiUrl,
      },
      onStep: async () => {
        const rows = items.listByChat(chat.id);
        const folds = compactions.listByChat(chat.id);
        publish({ type: 'status', chatId: chat.id, status: 'running', phase: '' });
        let folded = false;
        try {
          folded = await compact({
            items: rows, compactions: folds, signal: controller.signal,
            context: runtime.context, llm: runtime.llm, prompt: runtime.prompt.compaction,
          });
        } catch {}
        if (folded) {
          const saved = compactions.add(chat.id, folded);
          publish({ type: 'compaction', chatId: chat.id, compaction: saved });
        }
        return buildContext({
          items: items.listByChat(chat.id),
          compactions: compactions.listByChat(chat.id),
          liveResultChars: runtime.context.liveResultChars,
        }).input;
      },
    }, (event) => saveEvent(chat.id, event));
    lastText = result.text;
    publish({ type: 'done', chatId: chat.id, steps: result.steps, completed: true });
  } catch (cause) {
    if (String(cause.message ?? cause) === '已取消') ending = 'cancelled';
    else {
      ending = 'failed';
      const message = String(cause.message ?? cause);
      setError(chat.id, message);
      publish({ type: 'error', chatId: chat.id, message });
    }
  }
  const pending = calls.pendingTo(chat.id);
  if (pending.length) {
    const { finish } = await import('../calls/complete.js');
    for (const call of pending) await finish(call, ending, lastText);
  }
}
