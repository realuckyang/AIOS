const HN_API = "https://hacker-news.firebaseio.com/v0";

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error ${res.status}`);
  return res.json();
};

const list = async ({ type = "top", limit = 30 } = {}) => {
  const endpoint = type === "new" ? "newstories" : type === "best" ? "beststories" : "topstories";
  const ids = await fetchJson(`${HN_API}/${endpoint}.json`);
  const topIds = ids.slice(0, Math.min(limit, 50));
  const items = await Promise.all(topIds.map((id) => fetchJson(`${HN_API}/item/${id}.json`)));
  return {
    success: true,
    stories: items.filter(Boolean).map((item) => ({
      id: item.id, title: item.title || '', url: item.url || '',
      by: item.by || '', score: item.score || 0,
      time: item.time, descendants: item.descendants || 0
    }))
  };
};

export { list };
