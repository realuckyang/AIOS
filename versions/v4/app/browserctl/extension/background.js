// AIOS Browser Control — background service worker
// 轮询本地通信服务，领取 agent 下发的指令，在页面执行并回报结果。
const AGENT = "http://127.0.0.1:9524";

async function agentFetch(path, opts = {}) {
  try {
    const r = await fetch(AGENT + path, {
      method: opts.method || "GET",
      headers: { "content-type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return await r.json();
  } catch (e) {
    // 服务未启动等
    return null;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runInPage(tabId, code) {
  // 在目标页面的主世界执行一段脚本，返回结果。
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (src) => {
      try {
        // 注：eval 在部分站点的 CSP 下会被禁用；此时返回错误。
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

async function poll() {
  const cmd = await agentFetch("/poll");
  if (cmd && cmd.requestId) {
    await handleCmd(cmd);
  }
  setTimeout(poll, 1500);
}

// 启动轮询
poll();
