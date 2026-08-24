// NASA EONET — Natural Event Tracker (open, no key)
// 文档: https://eonet.gsfc.nasa.gov/docs/v3
//
// 同一个 API 可以拉野火 / 火山 / 风暴 / 沙尘 等。每条事件可能有多帧地理位置(轨迹),
// 我们只取 status=open 的最新一帧用于在地图上落点。
const ENDPOINT = "https://eonet.gsfc.nasa.gov/api/v3/events";

const fetchCategory = async (category, { limit = 200, days = 30 } = {}) => {
  const url = `${ENDPOINT}?category=${category}&status=open&limit=${limit}&days=${days}`;
  const res = await fetch(url, { headers: { "User-Agent": "AIOS-Earth" } });
  if (!res.ok) throw new Error(`EONET ${res.status}`);
  const data = await res.json();
  const items = [];
  for (const e of data.events || []) {
    const last = (e.geometry || []).slice(-1)[0];
    if (!last || last.type !== "Point") continue;
    items.push({
      id: e.id,
      title: e.title,
      time: last.date,
      lng: last.coordinates[0],
      lat: last.coordinates[1],
      sources: (e.sources || []).map((s) => ({ id: s.id, url: s.url })),
      meta: e.geometry.length > 1 ? { trackPoints: e.geometry.length } : null
    });
  }
  return items;
};

export const fetchWildfires = (opts) => fetchCategory("wildfires", opts);
export const fetchVolcanoes = (opts) => fetchCategory("volcanoes", opts);
export const fetchStorms    = (opts) => fetchCategory("severeStorms", opts);
