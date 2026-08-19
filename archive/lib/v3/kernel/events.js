// SSE bus:内核生产,userland 消费。fire-and-forget,事件易逝、文件才是事实。
// 全局事件 ID 递增,近期事件入环形缓存,断线用 Last-Event-ID 补发,补不齐发 gap。
const BUFFER_SIZE = 1000;

let nextId = 1;
const buffer = []; // { id, type, data }
const subscribers = new Set(); // http.ServerResponse

export function publish(type, data) {
  const event = { id: nextId++, type, data };
  buffer.push(event);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  for (const res of subscribers) send(res, event);
}

function send(res, { id, type, data }) {
  res.write(`id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
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
    if (lastId + 1 < oldest) {
      send(res, { id: nextId++, type: 'gap', data: {} });
    } else {
      for (const event of buffer) if (event.id > lastId) send(res, event);
    }
  }

  subscribers.add(res);
  req.on('close', () => subscribers.delete(res));
}
