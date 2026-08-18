const KEEP = 500;
const history = [];
const clients = new Set();
let nextId = 1;

const frame = (event) => `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;

export function publish(event) {
  const value = { id: nextId++, at: Date.now(), ...event };
  history.push(value);
  if (history.length > KEEP) history.shift();
  for (const res of clients) {
    try { res.write(frame(value)); } catch { clients.delete(res); }
  }
  return value;
}

export function connect(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write('retry: 1000\n\n');
  const since = Number(req.headers['last-event-id'] ?? 0);
  if (since > 0) {
    const oldest = history[0]?.id ?? nextId;
    if (since + 1 < oldest) res.write(frame({ id: nextId - 1, type: 'gap' }));
    for (const event of history) if (event.id > since) res.write(frame(event));
  }
  clients.add(res);
  const beat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15_000);
  const close = () => { clearInterval(beat); clients.delete(res); };
  res.on('close', close);
  res.on('error', close);
}
