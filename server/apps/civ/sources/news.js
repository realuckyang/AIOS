// 全球新闻 RSS 聚合 — 服务端拉, 解析, 缓存 5 分钟
const FEEDS = [
  { id: "bbc",     name: "BBC",       url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "ap",      name: "AP",        url: "https://feeds.apnews.com/rss/topnews" },
  { id: "nyt",     name: "NYT",       url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { id: "guardian",name: "Guardian",  url: "https://www.theguardian.com/world/rss" }
];

let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

// 极简 RSS 解析: 抓 <item>...</item> 中的 title / link / pubDate
const parseRss = (xml) => {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      if (!r) return "";
      let v = r[1].trim();
      const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v);
      if (cdata) v = cdata[1];
      return v.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    };
    items.push({
      title: pick("title"),
      link: pick("link"),
      time: pick("pubDate") || pick("dc:date")
    });
    if (items.length >= 5) break;
  }
  return items;
};

export const fetchNews = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const results = await Promise.all(FEEDS.map(async (f) => {
    try {
      const res = await fetch(f.url, { headers: { "User-Agent": "AIOS-Civ" } });
      if (!res.ok) return { ...f, items: [] };
      const xml = await res.text();
      return { id: f.id, name: f.name, items: parseRss(xml) };
    } catch { return { ...f, items: [] }; }
  }));
  cache = { at: Date.now(), data: results };
  return results;
};
