// Kernel 共享的无状态基础机制：有界文本、HTTP JSON 与 SSE。

export function boundedInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(Math.max(min, number), max);
}

export function createTextCollector(maxChars = 50_000) {
  const limit = boundedInteger(maxChars, 50_000);
  let text = '';
  let total = 0;
  return {
    push(chunk) {
      const value = String(chunk);
      total += value.length;
      if (text.length < limit) text += value.slice(0, limit - text.length);
    },
    value() {
      return total > limit ? `${text}\n…[输出被内核截断,共 ${total} 字符]` : text;
    },
    get truncated() { return total > limit; },
    get total() { return total; },
  };
}

export function writeJson(res, code, data, headers = {}) {
  res.writeHead(code, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
}

export function readJsonBody(req, maxBytes = 1_048_576) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    let exceeded = false;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        if (!exceeded) reject(new Error(`请求体超过限制: ${maxBytes} bytes`));
        exceeded = true;
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (exceeded) return;
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('请求体不是合法 JSON')); }
    });
    req.on('error', reject);
  });
}

export function writeSSE(res, type, data) {
  if (!res.writableEnded && !res.destroyed) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function readSSE(body, { maxEventBytes = 1_048_576, onEvent }) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (Buffer.byteLength(block) > maxEventBytes) throw new Error(`SSE 事件超过限制: ${maxEventBytes} bytes`);
      let type = '';
      const dataLines = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      const raw = dataLines.join('\n');
      if (!raw || raw === '[DONE]') continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }
      onEvent?.(type, data);
    }
    if (Buffer.byteLength(buffer) > maxEventBytes) throw new Error(`SSE 事件超过限制: ${maxEventBytes} bytes`);
  }
}
