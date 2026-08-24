// USGS 24h 地震 — 总数 + 最大震级 + sparkline (按 hour bucket)
const URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

export const fetchQuakes = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const res = await fetch(URL, { headers: { "User-Agent": "AIOS-Civ" } });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await res.json();
  const features = data.features || [];
  // 24 小时桶: 24 个数,过去最久 → 最近
  const now = Date.now();
  const buckets = new Array(24).fill(0);
  let m5plus = 0;
  let largest = null;
  for (const f of features) {
    const t = f.properties?.time;
    const mag = f.properties?.mag || 0;
    if (mag >= 5) m5plus++;
    if (!largest || mag > largest.mag) {
      largest = { mag, place: f.properties?.place || "", time: t };
    }
    if (t) {
      const hoursAgo = Math.floor((now - t) / 3600000);
      if (hoursAgo >= 0 && hoursAgo < 24) buckets[23 - hoursAgo]++;
    }
  }
  const result = {
    total: features.length,
    m5plus,
    largest,
    series: buckets
  };
  cache = { at: Date.now(), data: result };
  return result;
};
