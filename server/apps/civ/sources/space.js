// 太空相关:ISS 实时位置 + 在轨人员 + 即将发射的火箭

let cache = { at: 0, data: null };
const TTL = 60 * 1000;

const fetchIssAndCrew = async () => {
  // 这两个 API 都很轻, 一起拉
  const [issRes, crewRes] = await Promise.all([
    fetch("https://api.wheretheiss.at/v1/satellites/25544", { headers: { "User-Agent": "AIOS-Civ" } }),
    fetch("http://api.open-notify.org/astros.json", { headers: { "User-Agent": "AIOS-Civ" } })
  ]);
  let iss = null;
  let crew = null;
  if (issRes.ok) {
    const j = await issRes.json();
    iss = {
      lat: j.latitude,
      lng: j.longitude,
      altKm: Math.round(j.altitude),
      speedKmh: Math.round(j.velocity)
    };
  }
  if (crewRes.ok) {
    const j = await crewRes.json();
    crew = {
      total: j.number || 0,
      people: (j.people || []).map((p) => ({ name: p.name, craft: p.craft }))
    };
  }
  return { iss, crew };
};

const fetchLaunches = async () => {
  // Launch Library 2 — 接下来 5 场
  const url = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=5&mode=list";
  const res = await fetch(url, { headers: { "User-Agent": "AIOS-Civ" } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((l) => ({
    id: l.id,
    name: l.name,
    pad: l.pad?.name || "",
    location: l.pad?.location?.name || "",
    provider: l.launch_service_provider?.name || "",
    net: l.net,
    status: l.status?.abbrev || ""
  }));
};

export const fetchSpace = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const [{ iss, crew }, launches] = await Promise.all([fetchIssAndCrew(), fetchLaunches()]);
  const data = { iss, crew, launches };
  cache = { at: Date.now(), data };
  return data;
};
