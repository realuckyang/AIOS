// agent 运行时入口。**循环在这儿。**
//
//   拼好 input → stream 请求一次 → 拿回这一步的 item
//   ├ 没有工具调用 → 它说完了,这一轮结束
//   └ 有工具调用   → 交给 runner 跑完,结果接回 input,再请求一次
//
// llm/ 只管 Responses 请求,runner.js 只管跑工具,两边都不知道有循环这回事。
// 循环知道它俩,但不知道存储和 HTTP —— 外面要什么全靠 emit 交出去。

import { runTools } from './runner.js';
import { stream } from '../llm/index.js';

/** 用户说的一句话,包成协议认识的 item。 */
export function userItem(text) {
  return { type: 'message', role: 'user', content: String(text ?? '') };
}

/** 系统说的一句话。**它也进上下文** —— 模型下一轮读得到。 */
export function developerItem(text) {
  return { type: 'message', role: 'developer', content: String(text ?? '') };
}

/**
 * 跑一个 agent,直到它不再调工具。
 *
 * emit 收到的 —— 契约见 .docs/01-SSE-事件类型.md。事件类型和 item 类型是同一套词,
 * 前端分派的 switch 和存储里的 kind 对得上,不用把一个筐再打开分一遍。
 *
 * 返回 `{ text, steps, done }`:最后那句话和走了几步。
 */
export async function runAgent({
  instructions,
  tools,
  input,
  cwd,
  signal,
  // 派子 agent 的口子。**循环不知道这是什么**,原样转给 runner ——
  // 它要是认识对话和库,这一层就烂了
  env,
  config,
  onStep,
}, emit = () => {}) {
  // 自己攒一份,不动调用方传进来的那个数组
  let context = [...input];
  for (let step = 0; ; step += 1) {
    if (signal?.aborted) throw new Error('已取消');

    // **每一步开始前给调用方一次换掉上下文的机会。**
    //
    // 压缩、以及以后子 agent 的汇报回流,都从这一个口子进来 ——
    // 循环自己累积的那份 context 看不见别处往流里写的东西。
    // 只在运行开始前压缩是不够的:连续工具调用也能把窗口撑爆,
    // 撑爆之后模型直接报错,压缩连介入的机会都没有。
    //
    // agent/index.js 因此仍然不认识库、对话、压缩 —— 它只知道「问一句要不要换」。
    const fresh = await onStep?.(step);
    if (fresh) context = [...fresh];

    const { items, usage, text } = await stream(
      { instructions, tools, input: context, signal, config },
      emit,
    );

    // 定稿的先进上下文再交出去 —— 顺序反了的话,落库那边看到的是还没接上的一步
    context.push(...items);
    emitFinal(items, usage, emit);

    const calls = items.filter((item) => item.type === 'function_call');
    if (!calls.length) {
      return { text, steps: step + 1, done: true };
    }

    const outputs = await runTools(
      calls,
      { cwd, signal, env },
      // 一次给一条,形状仍是「一批」—— 界面一步步长出来,不用等整批跑完
      (call, item) => emit({ type: 'tool_results', items: [item] }),
    );
    context.push(...outputs);
  }
}

/**
 * 把这一步定稿的 item 按类型拆开发。
 *
 * **不发一个装着什么都有的筐** —— 那样前端收到之后还得再分派一遍,
 * 同一件事分类两次,两处规则一旦不一致就是 bug。
 *
 * **usage 挂在这一步最后一条上,不单发一条。** 它得跟着某条 item 存
 * (列就在 items 表上),单发的话「挂在哪条」这个问题就甩给接收端和存储端
 * 各自去猜 —— 两边猜得不一样就错位。这里答一次,两边都照着走。
 */
function emitFinal(items, usage, emit) {
  const calls = items.filter((item) => item.type === 'function_call');
  const events = [];

  for (const item of items) {
    if (item.type === 'reasoning') events.push({ type: 'reasoning', item });
    else if (item.type === 'message') events.push({ type: 'message', item });
  }
  if (calls.length) events.push({ type: 'tool_calls', items: calls });

  if (usage && events.length) events[events.length - 1].usage = usage;
  for (const event of events) emit(event);
}
