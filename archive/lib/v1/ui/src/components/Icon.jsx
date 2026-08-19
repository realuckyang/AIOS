// 内联 SVG 图标 —— 圆头线条，与 FableSeek 的 Icon 同款画法。
const PATHS = {
  // 侧边栏/面板：一个方框 + 左侧分割线，用来表示「面板」。
  panel: 'M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 4v16',
};

const MISSING = 'M4 4h16v16H4z';

export function Icon({ name, size = 18, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name] || MISSING} />
    </svg>
  );
}
