import { agentTask } from "../../app_shared/agentTask.js";

const summarize = async ({ title, url, text, locale = "en" }) => {
  const lang = locale === "zh" ? "中文" : "English";
  const source = url ? `Article URL: ${url}` : `Article text: ${text || "N/A"}`;
  const prompt = `Summarize the following HackerNews article in ${lang}. Output 3-5 bullet points covering the key ideas. Be concise.

Title: ${title}
${source}

Return only the summary bullet points, nothing else.`;

  const result = await agentTask({ app: "hackernews", title: `Summarize: ${title}`, prompt });
  return { success: true, summary: result.response || "" };
};

export { summarize };
