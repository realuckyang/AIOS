// 临时 chatPanel 桩 —— 旧版应用 (skeuomorphic 快照) 用 chatPanel 把"应用上下文"
// 与"快捷消息"推给侧边的 AI 聊天面板。AIOS 主仓还没把这一层重新接好,先 no-op
// 让组件挂载时不报错;等聊天面板对接好后,这个桩可以替换成真实 store。

export const chatPanel = {
  setContext: () => {},
  clearContext: () => {},
  setQuickMessages: () => {}
};
