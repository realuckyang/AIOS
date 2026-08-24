// USGS realtime earthquake feed
// 文档: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
const FEEDS = {
  hour:  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson",
  day:   "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week:  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
  month: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
};

export const fetchEarthquakes = async ({ minMagnitude = 2.5, days = 7 } = {}) => {
  const period = days <= 1 ? "day" : days <= 7 ? "week" : "month";
  const res = await fetch(FEEDS[period], { headers: { "User-Agent": "AIOS-Earth" } });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await res.json();
  return (data.features || [])
    .filter((f) => (f.properties?.mag ?? 0) >= minMagnitude)
    .map((f) => ({
      id: f.id,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: Math.round(f.geometry.coordinates[2] || 0),
      mag: Math.round((f.properties.mag || 0) * 10) / 10,
      place: f.properties.place || "",
      time: f.properties.time,
      tsunami: !!f.properties.tsunami
    }));
};
