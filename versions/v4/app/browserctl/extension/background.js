// AIOS Browser Control — background service worker
// 单点轮询本地通信服务，领取 agent 下发的指令、在页面执行并回报结果。
// 由 content script 的心跳触发轮询（保活），并用 chrome.alarms 兜底。
const AGENT = "http://127.0.0.1:9524";
let polling = false;

async function agentFetch(path, opts = {}) {
  try {
    const r = await fetch(AGENT + path, {
      method: opts.method || "GET",
      headers: { "content-type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return await r.json();
  } catch (e) {
    return null; // 服务未启动等
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runInPage(tabId, code) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (src) => {
      try {
        // eslint-disable-next-line no-eval
        const result = (0, eval)(src);
        return typeof result === "object" ? JSON.parse(JSON.stringify(result)) : result;
      } catch (e) {
        return { __evalError: String(e) };
      }
    },
    args: [code],
  });
  return res && res.result !== undefined ? res.result : null;
}

async function handleCmd(cmd) {
  const { requestId, type, payload } = cmd || {};
  let ok = false;
  let data = null;
  try {
    const tab = await getActiveTab();
    if (!tab) throw new Error("没有可操作的活动标签页");
    if (type === "getTabInfo") {
      data = { title: tab.title, url: tab.url };
      ok = true;
    } else if (type === "navigate") {
      await chrome.tabs.update(tab.id, { url: payload.url });
      data = { navigated: true, url: payload.url };
      ok = true;
    } else if (type === "run") {
      data = await runInPage(tab.id, payload.code);
      ok = !(data && data.__evalError);
      if (data && data.__evalError) data = { error: data.__evalError };
    } else if (type === "listTabs") {
      const all = await chrome.tabs.query({});
      data = all.map((t) => ({ id: t.id, title: t.title, url: t.url, active: t.active }));
      ok = true;
    } else {
      throw new Error("未知指令类型: " + type);
    }
  } catch (e) {
    ok = false;
    data = String(e);
  }
  await agentFetch("/report", { method: "POST", body: { requestId, ok, data } });
}

async function pump() {
  if (polling) return;
  polling = true;
  try {
    const cmd = await agentFetch("/poll?wait=5");
    if (cmd && cmd.requestId) await handleCmd(cmd);
  } catch (e) {
    // 忽略
  } finally {
    polling = false;
  }
}

// content script 心跳：保持 worker 活跃并触发轮询
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "heartbeat") {
    pump();
    sendResponse({ ok: true });
  }
  return true;
});

// alarms 兜底：即使没有 content script（如页面未注入），也每 30s 轮询一次
chrome.alarms.create("bctl", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "bctl") pump();
});

// 启动时立刻尝试一次
pump();
