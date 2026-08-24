import { agentTask } from "../../app_shared/agentTask.js";

const summarize = async ({ title, description, url, locale = "en" }) => {
  const lang = locale === "zh" ? "中文" : "English";
  const prompt = `Summarize this RSS article in ${lang}. Give 3-4 bullet points covering the key ideas. Be concise.

Title: ${title}
URL: ${url || "N/A"}
Description: ${description || "N/A"}

Return only the summary bullet points, nothing else.`;

  const result = await agentTask({ app: "rssreader", title: `Summarize: ${title}`, prompt });
  return { success: true, summary: result.response || "" };
};

export { summarize };
