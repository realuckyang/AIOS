// NOAA SWPC Aurora Forecast (Ovation)
// 文档: https://services.swpc.noaa.gov/json/ovation_aurora_latest.json
//
// 返回 [longitude, latitude, aurora] 的 1° × 1° 网格. aurora 是 0-100 的概率值.
// 我们只回传 >5% 概率的格点, 减少前端渲染量.
const URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

export const fetchAurora = async () => {
  const res = await fetch(URL, { headers: { "User-Agent": "AIOS-Earth" } });
  if (!res.ok) throw new Error(`SWPC ${res.status}`);
  const data = await res.json();
  const points = (data.coordinates || [])
    .filter(([, , v]) => v >= 5)
    .map(([lng, lat, value]) => ({
      // 经度归一到 -180~180
      lng: lng > 180 ? lng - 360 : lng,
      lat,
      value
    }));
  return {
    observed: data["Observation Time"],
    forecast: data["Forecast Time"],
    points
  };
};
