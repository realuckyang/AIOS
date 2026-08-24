import { getLatestSession } from "../repository/progress.js";
const DEFAULT_SCREEN = {
  content: `<div style="text-align:center;padding:20px;font-family:monospace;">
          <h2 style="margin:0 0 8px;font-size:16px;">Banana 3310</h2>
          <p style="margin:4px 0;font-size:12px;">欢迎使用经典手机模拟器</p>
          <hr style="border-color:#333;margin:8px 0;">
          <p style="margin:4px 0;font-size:11px;">请选择一个功能开始使用...</p>
        </div>`,
  options: [
    { text: "查看短信" },
    { text: "打电话" },
    { text: "玩贪吃蛇" },
    { text: "查看联系人" }
  ]
};
const getProgress = () => {
  const row = getLatestSession();
  if (!row) {
    return {
      current_screen: DEFAULT_SCREEN,
      isNew: true
    };
  }
  let currentScreen;
  try {
    currentScreen = JSON.parse(row.current_screen);
  } catch {
    currentScreen = { content: "", options: [] };
  }
  return {
    current_screen: currentScreen,
    battery_level: row.battery_level,
    isNew: false
  };
};
export {
  getProgress
};
