// Wikipedia 最热查询页 — Wikimedia REST
// 数据有 1~2 天延迟, 默认拿昨天的, 失败回退前天.
const HOST = "https://wikimedia.org/api/rest_v1/metrics/pageviews/top";

const fmt = (d) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`;

let cache = new Map();
const TTL = 60 * 60 * 1000; // 1 小时

const fetchOne = async (project, dateStr) => {
  const url = `${HOST}/${project}/all-access/${dateStr}`;
  const res = await fetch(url, { headers: { "User-Agent": "AIOS-Civ" } });
  if (!res.ok) throw new Error(`Wiki ${res.status}`);
  const data = await res.json();
  const articles = data.items?.[0]?.articles || [];
  return articles
    // 滤掉特殊页 (Main_Page, Special:Search 等)
    .filter((a) => !a.article.startsWith("Special:") && !["Main_Page", "首页"].includes(a.article))
    .slice(0, 15)
    .map((a) => ({
      title: a.article.replace(/_/g, " "),
      views: a.views,
      url: `https://${project.replace(".wikipedia", ".wikipedia.org")}/wiki/${encodeURIComponent(a.article)}`
    }));
};

export const fetchWikiTop = async (lang = "zh") => {
  const project = `${lang}.wikipedia`;
  const cached = cache.get(project);
  if (cached && Date.now() - cached.at < TTL) return cached.data;

  const yest = new Date(Date.now() - 24 * 3600 * 1000);
  const dayBefore = new Date(Date.now() - 48 * 3600 * 1000);
  let items = [];
  try { items = await fetchOne(project, fmt(yest)); }
  catch { items = await fetchOne(project, fmt(dayBefore)); }

  cache.set(project, { at: Date.now(), data: items });
  return items;
};
