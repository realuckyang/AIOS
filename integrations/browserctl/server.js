// AIOS Browser Control integration — agent 侧本地通信服务
// 纯 node 内置 http，无需任何依赖。扩展 background 连它轮询指令并回报结果。
//
// 端点:
//   GET  /ping            -> {ok:true}
//   POST /command         -> agent 下发 {type,payload}，生成 requestId 入队
//   GET  /poll?wait=N     -> 扩展领取下一条指令（可长轮询 wait 秒）
//   POST /report          -> 扩展回报 {requestId,ok,data}
//   GET  /results?id=...  -> agent 读取某 requestId 的结果
//   GET  /reset           -> 清空队列与结果
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.BROWSERCTL_PORT || 9524);

let queue = [];          // 待办指令（FIFO）
const results = new Map(); // requestId -> {ok,data,at}
let waiters = [];        // /poll 长轮询挂起的响应

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function sendCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

function pushCommand(payload) {
  const requestId = randomUUID();
  queue.push({ requestId, ...payload });
  // 唤醒等待中的长轮询
  while (waiters.length && queue.length) {
    const w = waiters.shift();
    const cmd = queue.shift();
    clearTimeout(w.timer);
    json(w.res, 200, cmd);
  }
  return requestId;
}

const server = createServer(async (req, res) => {
  console.log(`[bctl ${new Date().toISOString()}] ${req.method} ${req.url}`);
  sendCORS(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/ping") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/command") {
    const body = await readBody(req);
    const id = pushCommand(body);
    return json(res, 200, { requestId: id, queued: true });
  }

  if (req.method === "GET" && url.pathname === "/poll") {
    if (queue.length) return json(res, 200, queue.shift());
    const wait = Math.min(Number(url.searchParams.get("wait") || 0), 30);
    if (wait > 0) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          waiters = waiters.filter((w) => w !== holder);
          json(res, 200, { empty: true });
          resolve();
        }, wait * 1000);
        const holder = { res, timer, resolve };
        waiters.push(holder);
      });
      return;
    }
    return json(res, 200, { empty: true });
  }

  if (req.method === "POST" && url.pathname === "/report") {
    const body = await readBody(req);
    if (body.requestId) results.set(body.requestId, { ok: !!body.ok, data: body.data, at: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/results") {
    const id = url.searchParams.get("id");
    if (id) return json(res, 200, results.get(id) || null);
    return json(res, 200, [...results.entries()].map(([id, v]) => ({ requestId: id, ...v })));
  }

  if (req.method === "GET" && url.pathname === "/reset") {
    queue = [];
    results.clear();
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[browserctl] agent bridge listening on http://127.0.0.1:${PORT}`);
});
