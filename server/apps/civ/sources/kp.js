// NOAA SWPC Planetary K-index (3-小时分辨率,过去 24h+)
// https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
const URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

let cache = { at: 0, data: null };
const TTL = 5 * 60 * 1000;

export const fetchKp = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const res = await fetch(URL, { headers: { "User-Agent": "AIOS-Civ" } });
  if (!res.ok) throw new Error(`SWPC ${res.status}`);
  const arr = await res.json();
  // 第一行是 header, 后面是 [time_tag, kp, a_running, station_count]
  const rows = arr.slice(1);
  const series = rows.slice(-24).map((r) => Number(r[1]) || 0);
  const last = rows[rows.length - 1] || [];
  const data = {
    current: Number(last[1]) || 0,
    time: last[0] || null,
    series
  };
  cache = { at: Date.now(), data };
  return data;
};
