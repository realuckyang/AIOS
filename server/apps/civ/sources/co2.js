// NOAA Mauna Loa 每周 CO2 浓度
// https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv
// 行格式: yyyy mm dd decimal_date ppm yyyy_ago_ppm yyyy_ago_diff
const URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv";

let cache = { at: 0, data: null };
const TTL = 12 * 3600 * 1000;

export const fetchCO2 = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const res = await fetch(URL, { headers: { "User-Agent": "AIOS-Civ" } });
  if (!res.ok) throw new Error(`Mauna Loa ${res.status}`);
  const txt = await res.text();
  const rows = txt.split("\n").filter((l) => l && !l.startsWith("#"));
  const points = rows.map((l) => {
    const c = l.trim().split(/\s+/);
    return { date: `${c[0]}-${c[1].padStart(2, "0")}-${c[2].padStart(2, "0")}`, ppm: Number(c[4]) };
  }).filter((p) => Number.isFinite(p.ppm));
  // 取最近 52 周做 sparkline
  const recent = points.slice(-52);
  const last  = points[points.length - 1];
  const yearAgo = points[points.length - 53] || points[0];
  const data = {
    current: last?.ppm,
    date: last?.date,
    yearAgo: yearAgo?.ppm,
    yearChange: last && yearAgo ? +(last.ppm - yearAgo.ppm).toFixed(2) : null,
    series: recent.map((p) => p.ppm),
    preIndustrial: 280
  };
  cache = { at: Date.now(), data };
  return data;
};
