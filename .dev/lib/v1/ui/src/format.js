export const textOf = (item) => {
  if (typeof item.content === 'string') return item.content;
  if (Array.isArray(item.content)) return item.content.map((part) => part.text ?? '').join('');
  return '';
};

export const formatClock = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const DAY = 86400000;
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const formatRelative = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = startOfDay(now) - startOfDay(d);
  if (diff <= 0) return formatClock(ts);
  if (diff <= DAY) return '昨天';
  if (diff <= 6 * DAY) return WEEK[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};
