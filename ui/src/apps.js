// app 注册.每个 app 给:id / 中文名 / Material 图标名 / 主题色 / 是否有内部侧栏 / 动态加载.
//
// hasDrawer:决定顶栏左上角 ☰ 按钮是否显示 + 内部侧栏是否启用.
// 没有侧栏的 app(纯单页内容)直接隐藏 ☰,顶栏左侧只剩 logo.
const apps = [
  {
    id: 'chat',
    name: '对话',
    icon: 'forum',
    color: '#34a853',
    hasDrawer: true,
    load: () => import('./apps/chat/index.vue'),
    intent: () => import('./apps/chat/intent.js')
  },
  {
    id: 'tasks',
    name: '任务',
    icon: 'task_alt',
    color: '#1a73e8',
    hasDrawer: true,
    load: () => import('./apps/tasks/index.vue')
  },
  {
    id: 'notebook',
    name: '笔记本',
    icon: 'push_pin',
    color: '#b5835a',
    hasDrawer: false,
    load: () => import('./apps/notebook/index.vue')
  },
  {
    id: 'finance',
    name: '记账本',
    icon: 'menu_book',
    color: '#a41b1b',
    hasDrawer: false,
    load: () => import('./apps/finance/index.vue')
  },
  {
    id: 'terminal',
    name: '终端',
    icon: 'terminal',
    color: '#202124',
    hasDrawer: true,
    load: () => import('./apps/terminal/index.vue')
  },
  {
    id: 'files',
    name: '文件',
    icon: 'folder',
    color: '#fbbc04',
    hasDrawer: true,
    load: () => import('./apps/files/index.vue')
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: 'code',
    color: '#d97757',
    hasDrawer: true,
    load: () => import('./apps/claude-code/index.vue')
  },
  {
    id: 'sysinfo',
    name: '系统状态',
    icon: 'monitoring',
    color: '#9334e6',
    hasDrawer: false,
    load: () => import('./apps/sysinfo/index.vue')
  },
  {
    id: 'subbox',
    name: '订阅箱',
    icon: 'inbox',
    color: '#0ea5e9',
    hasDrawer: false,
    load: () => import('./apps/subbox/index.vue')
  },
  {
    id: 'banana',
    name: '老手机',
    icon: 'smartphone',
    color: '#a8b89c',
    hasDrawer: false,
    load: () => import('./apps/banana/index.vue')
  },
  {
    id: 'fortune',
    name: '算一卦',
    icon: 'auto_awesome',
    color: '#b8860b',
    hasDrawer: false,
    load: () => import('./apps/fortune/index.vue')
  },
  {
    id: 'ghtrending',
    name: 'GH 热榜',
    icon: 'trending_up',
    color: '#24292e',
    hasDrawer: true,
    load: () => import('./apps/ghtrending/index.vue')
  },
  {
    id: 'rssreader',
    name: 'RSS 阅读',
    icon: 'rss_feed',
    color: '#ee802f',
    hasDrawer: false,
    load: () => import('./apps/rssreader/index.vue')
  },
  {
    id: 'memory',
    name: '记忆',
    icon: 'psychology',
    color: '#8e6e3c',
    hasDrawer: false,
    load: () => import('./apps/memory/index.vue')
  },
  {
    id: 'lovehouse',
    name: '虚拟伴侣',
    icon: 'favorite',
    color: '#ec407a',
    hasDrawer: false,
    load: () => import('./apps/lovehouse/index.vue')
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    icon: 'forum',
    color: '#ff6600',
    hasDrawer: false,
    load: () => import('./apps/hackernews/index.vue')
  },
  {
    id: 'poker',
    name: '炸金花',
    icon: 'casino',
    color: '#16a34a',
    hasDrawer: false,
    load: () => import('./apps/poker/index.vue')
  },
  {
    id: 'treasure',
    name: '藏宝阁',
    icon: 'inventory_2',
    color: '#8b6f47',
    hasDrawer: false,
    load: () => import('./apps/treasure/index.vue')
  },
  {
    id: 'debate',
    name: '辩论台',
    icon: 'forum',
    color: '#7c3aed',
    hasDrawer: false,
    load: () => import('./apps/debate/index.vue')
  },
  {
    id: 'earth',
    name: '地球',
    icon: 'public',
    color: '#0ea5e9',
    hasDrawer: true,
    load: () => import('./apps/earth/index.vue')
  },
  {
    id: 'civ',
    name: '文明',
    icon: 'language',
    color: '#a855f7',
    hasDrawer: false,
    load: () => import('./apps/civ/index.vue')
  },
  {
    id: 'cryptobot',
    name: '炒币机',
    icon: 'currency_bitcoin',
    color: '#f9ab00',
    hasDrawer: false,
    load: () => import('./apps/cryptobot/index.vue')
  },
  {
    id: 'workshop',
    name: '工坊',
    icon: 'storefront',
    color: '#0f9d58',
    hasDrawer: false,
    load: () => import('./apps/workshop/index.vue')
  },
  {
    id: 'settings',
    name: '设置',
    icon: 'settings',
    color: '#5f6368',
    hasDrawer: false,
    load: () => import('./apps/settings/index.vue')
  }
];

const getApp = (appId) => apps.find((item) => item.id === appId) || null;

export {
  apps,
  getApp
};
