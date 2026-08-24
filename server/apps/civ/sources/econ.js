// 全球经济总量 — 跟 conflict.js 一样, 用权威机构年度报告里的静态数字
// 来源: IMF World Economic Outlook · World Bank WDI · UBS Global Wealth Report
//
// 每秒累积值前端做插值, 后端只给年度基数 + 增长率.

const FACTS = {
  // 全球总量 (IMF WEO Oct 2024)
  globalGdpUsd:    110000000000000,   // $110T 名义 GDP / 年
  globalGrowth:    3.2,                // 实际增长率 %
  perCapitaUsd:    13840,              // 全球人均 (World Bank 2023)
  // 贫困 / 不平等
  extremePoverty:  692000000,          // <$2.15/日 (World Bank 2024)
  top1WealthPct:   45.8,                // 最富 1% 占总财富比例 (UBS 2024)
  globalDebt:      315000000000000     // 全球总债务 $315T (IIF 2024)
};

// IMF WEO Oct 2024 名义 GDP, 单位: 万亿美元
const TOP_ECONOMIES = [
  { name: "美国",   gdp: 29.17, region: "🇺🇸" },
  { name: "中国",   gdp: 18.27, region: "🇨🇳" },
  { name: "德国",   gdp: 4.71,  region: "🇩🇪" },
  { name: "日本",   gdp: 4.07,  region: "🇯🇵" },
  { name: "印度",   gdp: 3.89,  region: "🇮🇳" },
  { name: "英国",   gdp: 3.59,  region: "🇬🇧" },
  { name: "法国",   gdp: 3.17,  region: "🇫🇷" },
  { name: "意大利", gdp: 2.38,  region: "🇮🇹" },
  { name: "加拿大", gdp: 2.21,  region: "🇨🇦" },
  { name: "巴西",   gdp: 2.19,  region: "🇧🇷" }
];

export const fetchEcon = async () => {
  return {
    facts: FACTS,
    topEconomies: TOP_ECONOMIES,
    source: "IMF WEO Oct 2024 · World Bank WDI · UBS Global Wealth 2024"
  };
};
