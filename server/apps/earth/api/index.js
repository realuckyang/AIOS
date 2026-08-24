import { json } from "../../../shared/http/json.js";
import { fetchEarthquakes } from "../sources/earthquake.js";
import { fetchWildfires, fetchVolcanoes, fetchStorms } from "../sources/eonet.js";
import { fetchAurora } from "../sources/aurora.js";

const wrap = async (res, fn) => {
  try { return json(res, { ok: true, ...(await fn()) }); }
  catch (e) { return json(res, { ok: false, error: e.message }, 500); }
};

export const handleEarthApi = async (req, res, path) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (path === "/apps/earth/earthquake" && req.method === "GET") {
    const minMag = Number(url.searchParams.get("minMagnitude") || 2.5);
    const days = Number(url.searchParams.get("days") || 7);
    return wrap(res, async () => ({ items: await fetchEarthquakes({ minMagnitude: minMag, days }) }));
  }
  if (path === "/apps/earth/wildfire" && req.method === "GET") {
    const days = Number(url.searchParams.get("days") || 30);
    return wrap(res, async () => ({ items: await fetchWildfires({ days }) }));
  }
  if (path === "/apps/earth/volcano" && req.method === "GET") {
    const days = Number(url.searchParams.get("days") || 90);
    return wrap(res, async () => ({ items: await fetchVolcanoes({ days }) }));
  }
  if (path === "/apps/earth/storm" && req.method === "GET") {
    const days = Number(url.searchParams.get("days") || 30);
    return wrap(res, async () => ({ items: await fetchStorms({ days }) }));
  }
  if (path === "/apps/earth/aurora" && req.method === "GET") {
    return wrap(res, async () => await fetchAurora());
  }
  return false;
};
