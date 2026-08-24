// AIOS Browser Control integration — content script
// 注入到每个页面。作用是：保持 background service worker 活跃 ——
// 周期性向后台发心跳，后台收到心跳即轮询本地服务领取指令并执行。
// 这样扩展无需用户在 chrome://extensions 手动点开，装上就持续待命。
setInterval(() => {
  try {
    chrome.runtime.sendMessage({ type: "heartbeat" });
  } catch (e) {
    // 忽略：页面即将关闭等
  }
}, 2000);
