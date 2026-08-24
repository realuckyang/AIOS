import { json } from "../../../shared/http/json.js";
import { fetchCrypto } from "../sources/crypto.js";
import { fetchWikiTop } from "../sources/wiki.js";
import { fetchNews } from "../sources/news.js";
import { fetchCO2 } from "../sources/co2.js";
import { fetchQuakes } from "../sources/quakes.js";
import { fetchSpace } from "../sources/space.js";
import { fetchKp } from "../sources/kp.js";
import { fetchMarkets } from "../sources/markets.js";
import { fetchHN } from "../sources/hn.js";
import { fetchArxiv } from "../sources/arxiv.js";
import { fetchConflict } from "../sources/conflict.js";
import { fetchEcon } from "../sources/econ.js";
import { generateCivReport } from "../service/report.js";
import { getLatestReport, listReports, getReportById } from "../repository/reports.js";

const wrap = async (res, fn) => {
  try { return json(res, { ok: true, ...(await fn()) }); }
  catch (e) { return json(res, { ok: false, error: e.message }, 500); }
};

const routes = {
  "/apps/civ/crypto":  () => fetchCrypto().then((items) => ({ items })),
  "/apps/civ/news":    () => fetchNews().then((items) => ({ items })),
  "/apps/civ/co2":     () => fetchCO2(),
  "/apps/civ/quakes":  () => fetchQuakes(),
  "/apps/civ/space":   () => fetchSpace(),
  "/apps/civ/kp":      () => fetchKp(),
  "/apps/civ/markets": () => fetchMarkets().then((items) => ({ items })),
  "/apps/civ/hn":      () => fetchHN().then((items) => ({ items })),
  "/apps/civ/arxiv":   () => fetchArxiv().then((items) => ({ items })),
  "/apps/civ/conflict":() => fetchConflict(),
  "/apps/civ/econ":    () => fetchEcon()
};

export const handleCivApi = async (req, res, path) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (path === "/apps/civ/report" && req.method === "POST") {
    const lang = url.searchParams.get("lang") || "zh";
    return wrap(res, async () => await generateCivReport({ wikiLang: lang }));
  }
  if (path === "/apps/civ/report/latest" && req.method === "GET") {
    return wrap(res, async () => ({ item: getLatestReport() }));
  }
  if (path === "/apps/civ/report/list" && req.method === "GET") {
    return wrap(res, async () => ({ items: listReports() }));
  }
  if (path === "/apps/civ/report/detail" && req.method === "GET") {
    const id = url.searchParams.get("id");
    return wrap(res, async () => ({ item: getReportById(Number(id)) }));
  }
  if (path === "/apps/civ/wiki" && req.method === "GET") {
    const lang = url.searchParams.get("lang") || "zh";
    return wrap(res, async () => ({ items: await fetchWikiTop(lang), lang }));
  }
  const handler = routes[path];
  if (handler && req.method === "GET") return wrap(res, handler);
  return false;
};
