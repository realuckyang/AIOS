// HackerNews 当前最热 — Firebase API
let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

const fetchItem = async (id) => {
  const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
  return r.ok ? r.json() : null;
};

export const fetchHN = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const ids = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json").then((r) => r.json());
  const top = ids.slice(0, 10);
  const items = (await Promise.all(top.map(fetchItem)))
    .filter(Boolean)
    .map((it) => ({
      id: it.id,
      title: it.title,
      url: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
      score: it.score || 0,
      comments: it.descendants || 0,
      by: it.by,
      time: (it.time || 0) * 1000
    }));
  cache = { at: Date.now(), data: items };
  return items;
};
