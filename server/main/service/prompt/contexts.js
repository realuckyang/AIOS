import { listContexts } from "../../repository/context.js";

const trim = (value, max) => String(value || "").trim().slice(0, max);

const contexts = () => {
  const items = listContexts({ includeNone: false, limit: 40 });
  if (!items.length) return "";

  const lines = [];
  for (const item of items) {
    const title = trim(item.title, 120) || `${item.source}:${item.source_id}`;
    const summary = trim(item.summary, 800);
    const content = item.access === "full" ? trim(item.content, 4000) : "";
    lines.push([
      `### [${item.source}] ${title}`,
      summary ? `摘要：${summary}` : "",
      content ? `内容：\n${content}` : ""
    ].filter(Boolean).join("\n"));
  }

  return `

## 用户上下文
以下内容由用户或应用标记为 AI 可见。summary 级别只提供标题和摘要，full 级别提供标题、摘要和正文。
${lines.join("\n\n")}`;
};

export {
  contexts
};
