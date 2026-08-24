// 临时 i18n shim,只覆盖 finance/notebook 等拟物快照应用使用的 key。
// AIOS 主仓还没接入完整 i18n 框架,这里把 zh 字典内联,locale 默认锁 zh。

import { ref } from 'vue';

const dict = {
  // common
  common_save: '保存',
  common_delete: '删除',

  // framework
  app_sidebar_finance: '记账本',
  app_sidebar_notebook: '记事本',

  // finance
  finance_title: '记账本',
  finance_income: '收入',
  finance_expense: '支出',
  finance_balance: '结余',
  finance_date: '日期',
  finance_narrative: '摘要',
  finance_withdrawal: '支出',
  finance_deposit: '存入',
  finance_operation: '操作',
  finance_note_placeholder: '摘要事由...',
  finance_default_income_note: '存入',
  finance_default_expense_note: '支出',
  finance_chat_quick_1: '帮我分析这个月的支出',
  finance_chat_quick_2: '有哪些可以省的开支？',
  finance_chat_quick_3: '生成本月财务小结',

  // notebook
  notebook_back: '返回',
  notebook_optimize_action: '优化',
  notebook_save_action: '保存',
  notebook_apply_action: '应用',
  notebook_close_action: '关闭',
  notebook_delete_confirm: '确定要删除这条笔记吗？',
  notebook_cancel_action: '取消',
  notebook_delete_action: '删除',
  notebook_ai_polish: 'AI 润色',
  notebook_ai_loading: '正在润色...',
  notebook_empty_card: '（空）',
  notebook_editor_placeholder: '在这里记下你的灵感碎片...',
  notebook_just_now: '刚刚',
  notebook_minutes_ago: '{n}分钟前',
  notebook_hours_ago: '{n}小时前',
  notebook_days_ago: '{n}天前',
  notebook_create_failed: '保存失败',
  notebook_load_failed: '加载失败',
  notebook_delete_failed: '删除失败',
  notebook_optimize_failed: '优化失败',
  notebook_chat_quick_1: '帮我整理最近的笔记',
  notebook_chat_quick_2: '给我一些写作灵感',
  notebook_chat_quick_3: '帮我总结笔记要点'
};

export const locale = ref('zh');

export const t = (key, params = {}) => {
  let text = dict[key];
  if (text === undefined) return key;
  for (const [k, v] of Object.entries(params || {})) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
};

export const useI18n = () => ({ locale, t });
