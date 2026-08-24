// 战争 / 军备 / 风险 — 主要靠权威机构年度报告里的静态数字
//
// 数据来源 + 取数日期写在每条 source 字段, 方便定期更新.
// 这些数字之所以静态, 是因为它们本来就是年度统计 — 实时数据要么需付费 (ACLED) ,
// 要么口径混乱(战争实时计数 没有公认 API),静态权威数字反而最可信.

const FACTS = [
  {
    id: "nuclear",
    label: "核弹头",
    value: 12331,
    unit: "枚",
    note: "九国全球总库存",
    source: "FAS Nuclear Notebook · 2024"
  },
  {
    id: "doomsday",
    label: "末日钟",
    value: 89,
    unit: "秒",
    note: "距午夜",
    source: "Bulletin of Atomic Scientists · 2025"
  },
  {
    id: "milspend",
    label: "全球军费",
    value: 2443,
    unit: "亿美元",
    isBillion: true,  // 显示时换算成万亿
    note: "全年 · 占 GDP 2.5%",
    source: "SIPRI · 2024"
  },
  {
    id: "peacekeepers",
    label: "维和部队",
    value: 67800,
    unit: "人",
    note: "联合国 11 个任务区",
    source: "UN Peacekeeping · 2025"
  },
  {
    id: "conflicts",
    label: "活跃武装冲突",
    value: 38,
    unit: "处",
    note: "包括内战 / 跨境冲突",
    source: "Wikipedia · 持续更新"
  },
  {
    id: "displaced",
    label: "流离失所",
    value: 122600000,
    unit: "人",
    note: "战争 / 迫害 / 暴力",
    source: "UNHCR Global Trends · 2024"
  }
];

export const fetchConflict = async () => {
  return { facts: FACTS };
};
