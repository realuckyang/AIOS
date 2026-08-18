import { normalize } from './normalize.js';
import { sse } from './sse.js';

/**
 * 执行一次 Responses API 流式请求。
 *
 * onEvent 只接收增量 message/reasoning；定稿 item 通过返回值交给 Agent 循环，
 * 避免同一条内容既作为增量又作为定稿重复落库。
 */
export async function stream({ instructions, input, tools, signal, config }, onEvent = () => {}) {
  const { responsesUrl: rawResponsesUrl, key: rawKey, model } = config;
  const responsesUrl = String(rawResponsesUrl ?? '').trim();
  const key = String(rawKey ?? '').trim();

  if (!responsesUrl) {
    throw new Error('尚未配置 Responses API 地址，请在设置中填写完整地址');
  }
  if (!key) {
    throw new Error('尚未配置模型服务密钥，请在设置中填写密钥');
  }

  const body = {
    input: normalize(input),
    stream: true,
    ...(instructions && { instructions }),
    ...(tools?.length && { tools }),
    ...(model && { model }),
  };

  let response;
  try {
    response = await fetch(responsesUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw new Error('已取消');
    throw new Error(`请求发不出去:${cause.message}`);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `${response.status} ${response.statusText}`.trim());
  }

  const items = [];
  let text = '';
  let usage = null;

  for await (const event of sse(response.body)) {
    switch (event.type) {
      case 'response.output_text.delta':
        text += event.delta ?? '';
        onEvent({ type: 'message', delta: event.delta ?? '' });
        break;

      case 'response.reasoning_summary_text.delta':
      case 'response.reasoning_text.delta':
        onEvent({ type: 'reasoning', delta: event.delta ?? '' });
        break;

      case 'response.output_item.done':
        if (event.item) items.push(event.item);
        break;

      case 'response.completed':
      case 'response.incomplete':
        usage = event.response?.usage ?? usage;
        break;

      case 'error':
      case 'response.failed':
        throw new Error(event.error?.message ?? event.response?.error?.message ?? '上游返回错误');

      default:
        break;
    }
  }

  return { items, usage, text };
}
