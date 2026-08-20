// App 对 UI 发布事件；事实持久在 var/,SSE 只负责实时通知。
let bufferSize = 1000;
let nextId = 1;
const buffer = [];
const subscribers = new Set();

function send(res, { id, type, data }) {
  res.write(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function publish(type, data) {
  const event = { id: nextId++, type, data };
  buffer.push(event);
  while (buffer.length > bufferSize) buffer.shift();
  for (const res of subscribers) send(res, event);
}

export function configure({ eventBufferSize } = {}) {
  if (Number.isFinite(eventBufferSize)) bufferSize = Math.max(0, Math.trunc(eventBufferSize));
  while (buffer.length > bufferSize) buffer.shift();
}

export function subscribe(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  const lastId = Number(req.headers['last-event-id']) || 0;
  if (lastId > 0) {
    const oldest = buffer.length ? buffer[0].id : nextId;
    if (lastId + 1 < oldest) send(res, { id: nextId++, type: 'gap', data: {} });
    else for (const event of buffer) if (event.id > lastId) send(res, event);
  }
  subscribers.add(res);
  req.on('close', () => subscribers.delete(res));
}
