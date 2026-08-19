// Responses API 协议适配:构造一次流式请求,归并增量与定稿。
// 不知道对话、调度、bash。非成功状态时响应正文原样上抛。
export async function request({ url, apiKey, model, instructions, input, tools, signal, onDelta }) {
  if (!url || !apiKey || !model) throw new Error('模型服务未配置:请在 config.json 填写 responsesUrl、apiKey、model');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, instructions, input, tools, stream: true }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `${res.status} ${res.statusText}`);
  }

  const items = [];
  let usage = null;
  let buffer = '';
  const decoder = new TextDecoder();

  const handle = (event) => {
    const type = event.type || '';
    if (type === 'response.output_text.delta' && typeof event.delta === 'string') {
      onDelta?.('message', event.delta);
    } else if (type.includes('reasoning') && type.endsWith('.delta') && typeof event.delta === 'string') {
      onDelta?.('reasoning', event.delta);
    } else if (type === 'response.output_item.done' && event.item) {
      items.push(event.item);
    } else if (type === 'response.completed') {
      usage = event.response?.usage ?? null;
      if (items.length === 0 && Array.isArray(event.response?.output)) items.push(...event.response.output);
    } else if (type === 'response.failed' || type === 'error') {
      throw new Error(JSON.stringify(event.response?.error ?? event.error ?? event));
    }
  };

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let event;
        try { event = JSON.parse(data); } catch { continue; }
        handle(event);
      }
    }
  }

  return { items, usage };
}
