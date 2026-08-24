// arXiv 最近论文 RSS — cs.AI / cs.CL / cs.LG / physics 综合
const FEEDS = [
  { url: "http://export.arxiv.org/rss/cs.AI", cat: "cs.AI" },
  { url: "http://export.arxiv.org/rss/cs.CL", cat: "cs.CL" },
  { url: "http://export.arxiv.org/rss/cs.LG", cat: "cs.LG" }
];

let cache = { at: 0, data: null };
const TTL = 60 * 60 * 1000;

const parseRss = (xml, cat) => {
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
      return v.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    };
    items.push({ title: pick("title"), link: pick("link"), cat });
    if (items.length >= 4) break;
  }
  return items;
};

export const fetchArxiv = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const results = await Promise.all(FEEDS.map(async (f) => {
    try {
      const res = await fetch(f.url, { headers: { "User-Agent": "AIOS-Civ" } });
      if (!res.ok) return [];
      return parseRss(await res.text(), f.cat);
    } catch { return []; }
  }));
  const flat = results.flat();
  cache = { at: Date.now(), data: flat };
  return flat;
};
