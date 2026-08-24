// CoinGecko 公开 API — 免 key, 但限频 (~30 req/min). 服务端缓存 60s.
const URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h";

let cache = { at: 0, data: null };
const TTL = 60 * 1000;

export const fetchCrypto = async () => {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const res = await fetch(URL, { headers: { "User-Agent": "AIOS-Civ", Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const list = await res.json();
  const data = list.map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol?.toUpperCase(),
    image: c.image,
    price: c.current_price,
    marketCap: c.market_cap,
    change24h: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
    spark: (c.sparkline_in_7d?.price || []).filter((_, i, a) => i % 12 === 0).slice(-24)
  }));
  cache = { at: Date.now(), data };
  return data;
};
