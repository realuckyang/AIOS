import { instantTask } from "../../app_shared/instantTask.js";
import { insertReport } from "../repository/reports.js";
import { fetchArxiv } from "../sources/arxiv.js";
import { fetchCO2 } from "../sources/co2.js";
import { fetchConflict } from "../sources/conflict.js";
import { fetchCrypto } from "../sources/crypto.js";
import { fetchEcon } from "../sources/econ.js";
import { fetchHN } from "../sources/hn.js";
import { fetchKp } from "../sources/kp.js";
import { fetchMarkets } from "../sources/markets.js";
import { fetchNews } from "../sources/news.js";
import { fetchQuakes } from "../sources/quakes.js";
import { fetchSpace } from "../sources/space.js";
import { fetchWikiTop } from "../sources/wiki.js";

const settle = async (key, fn) => {
  try {
    return [key, await fn()];
  } catch (error) {
    return [key, { error: error?.message || String(error) }];
  }
};

const clip = (value, max = 16000) => {
  const text = JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n...TRUNCATED` : text;
};

const compactItems = (items = [], fields = [], limit = 8) => {
  if (!Array.isArray(items)) return items;
  return items.slice(0, limit).map((item) => {
    const out = {};
    for (const field of fields) out[field] = item?.[field];
    return out;
  });
};

const collectCivData = async ({ wikiLang = "zh" } = {}) => {
  const entries = await Promise.all([
    settle("co2", fetchCO2),
    settle("quakes", fetchQuakes),
    settle("space", fetchSpace),
    settle("kp", fetchKp),
    settle("markets", fetchMarkets),
    settle("crypto", fetchCrypto),
    settle("wiki", () => fetchWikiTop(wikiLang)),
    settle("news", fetchNews),
    settle("hn", fetchHN),
    settle("arxiv", fetchArxiv),
    settle("conflict", fetchConflict),
    settle("econ", fetchEcon)
  ]);
  const data = Object.fromEntries(entries);

  return {
    generatedAt: new Date().toISOString(),
    co2: data.co2,
    quakes: data.quakes,
    space: data.space,
    kp: data.kp,
    econ: data.econ,
    conflict: data.conflict,
    markets: compactItems(data.markets, ["symbol", "label", "region", "price", "change"], 18),
    crypto: compactItems(data.crypto, ["symbol", "name", "price", "change24h", "marketCap"], 10),
    wiki: compactItems(data.wiki, ["title", "views", "url"], 12),
    hn: compactItems(data.hn, ["title", "score", "comments", "url", "time"], 8),
    arxiv: compactItems(data.arxiv, ["title", "cat", "link"], 8),
    news: Array.isArray(data.news)
      ? data.news.map((source) => ({
          id: source.id,
          name: source.name,
          items: compactItems(source.items, ["title", "link", "time"], 5)
        }))
      : data.news
  };
};

const buildPrompt = (snapshot) => `你是 AIOS 的“文明看板”分析员。你收到的是当前文明数据看板的原始快照。

请基于数据生成一份中文分析报告。不要编造数据，不确定就说明“不确定”。报告要有判断，不要只是复述数据。

写作要求：
1. 先给一个 2-3 句的总判断。
2. 然后分成：生态与自然、经济与财富、科技与知识、信息与注意力、冲突与风险、太空与前沿。
3. 每一节给出关键观察、风险/机会、需要继续观察的信号。
4. 最后给出“今日文明状态”三轴：压力、韧性、动能，用 0-100 的估计分，并解释原因。
5. 保持克制、批判、具体。不要使用夸张标题，不要写成新闻稿。

数据快照：
${clip(snapshot)}
`;

const generateCivReport = async ({ wikiLang = "zh" } = {}) => {
  const snapshot = await collectCivData({ wikiLang });
  const result = await instantTask({
    app: "civ",
    title: "文明看板分析报告",
    prompt: buildPrompt(snapshot),
    meta: { generatedAt: snapshot.generatedAt, source: "civ-report" }
  });

  const reportText = result.response || "";
  const taskId = result.id || null;
  const rowId = insertReport({ report: reportText, taskId });

  return {
    success: true,
    id: rowId,
    report: reportText,
    generatedAt: snapshot.generatedAt,
    taskId
  };
};

export { generateCivReport };
