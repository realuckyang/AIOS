import { agentTask } from "../../app_shared/agentTask.js";
import { finishRun } from "../repository/config.js";
import { insertReport } from "../repository/reports.js";

const buildPrompt = (cfg) => {
  const today = new Date().toISOString().slice(0, 10);
  return `你是用户的"每日订阅箱"代理。今天是 ${today}。请为以下订阅生成一份当日早报。

订阅主题: ${cfg.topic}

# 执行规则
1. 必须使用 terminal_exec 工具(curl / 各类公开数据接口 / 网页抓取 / RSS 等)去获取真实最新信息,不要凭训练知识编造内容。每条要点都应来自你刚刚获取的数据。
2. 优先抓与"订阅主题"直接相关的最新动态(新闻、价格、版本发布、行情、赛果等),覆盖 24 小时内为佳。
3. 如果某些信息源访问失败,降级到能拿到的其他源,并在结尾简短说明哪些源没拿到。
4. 输出格式: 纯文本中文,不要 JSON、不要 markdown 代码块。允许使用 emoji 和短行。结构如下:
   - 第一行: 一句话主旨(20 字以内)
   - 然后 3-8 条要点,每条 1-2 行,前面加 "• ",末尾如有数据/价格用括号附上
   - 最后一行可选: "数据来源: ..." 简短列出主要来源域名
5. 总长度控制在 200-500 字之间。

现在开始。`;
};

const runOnce = async (cfg) => {
  try {
    const data = await agentTask({
      app: "subbox",
      title: (cfg.topic || "").slice(0, 30) || "Subbox Daily",
      prompt: buildPrompt(cfg)
    });
    const summary = String(data.response || "").trim();
    insertReport({
      summary: summary || "(本次执行未返回有效内容)",
      taskId: Number(data.id || 0),
      ok: Boolean(summary),
      error: summary ? "" : "empty response"
    });
    finishRun({ ok: Boolean(summary), error: summary ? "" : "empty response" });
  } catch (err) {
    const msg = err?.message || String(err);
    insertReport({ summary: "", taskId: 0, ok: false, error: msg });
    finishRun({ ok: false, error: msg });
  }
};

export { runOnce };
