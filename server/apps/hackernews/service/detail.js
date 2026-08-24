const HN_API = "https://hacker-news.firebaseio.com/v0";

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error ${res.status}`);
  return res.json();
};

const fetchComments = async (ids = [], depth = 0, maxDepth = 2) => {
  if (!ids.length || depth > maxDepth) return [];
  const batch = ids.slice(0, 10);
  const items = await Promise.all(batch.map((id) => fetchJson(`${HN_API}/item/${id}.json`).catch(() => null)));
  const comments = [];
  for (const item of items) {
    if (!item || item.deleted || item.dead) continue;
    const children = item.kids ? await fetchComments(item.kids, depth + 1, maxDepth) : [];
    comments.push({
      id: item.id, by: item.by || '', text: item.text || '',
      time: item.time, children
    });
  }
  return comments;
};

const detail = async ({ id }) => {
  if (!id) return { status: 400, message: "id is required" };
  const item = await fetchJson(`${HN_API}/item/${id}.json`);
  if (!item) return { status: 404, message: "story not found" };
  const comments = await fetchComments(item.kids || []);
  return {
    success: true,
    story: {
      id: item.id, title: item.title || '', url: item.url || '', text: item.text || '',
      by: item.by || '', score: item.score || 0,
      time: item.time, descendants: item.descendants || 0
    },
    comments
  };
};

export { detail };
