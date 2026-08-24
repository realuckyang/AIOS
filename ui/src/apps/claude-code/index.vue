<template>
  <div class="app-frame">
    <header class="topbar">
      <div class="brand"><span class="name">Claude Code</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <!-- Onboarding: CLI 未安装 -->
    <section v-if="cliStatus && !cliStatus.installed" class="pane cc-app-root onboarding-pane">
      <Onboarding :checking="checkingStatus" @recheck="fetchStatus" />
    </section>

    <!-- 主体: 顶部 tab 条 + 内容白卡 -->
    <template v-else>
      <nav class="cc-tabs" @wheel.passive="onTabsWheel">
        <button v-for="t in tabs" :key="t.id"
          class="cc-tab"
          :class="{ active: activeTab === t.id }"
          @click="pickTab(t.id)">
          <component :is="t.icon" :size="15" :stroke-width="1.8" class="cc-tab-ic" />
          <span>{{ t.label }}</span>
        </button>
      </nav>

      <section class="pane cc-app-root">
        <ChatTab     v-if="activeTab === 'chat'"     :key="chatKey" :installed="cliStatus?.installed || false" :load-session-id="loadSessionId" />
        <ConversationsTab v-else-if="activeTab === 'conversations'" @open="onOpenConversation" />
        <ProjectsTab v-else-if="activeTab === 'projects'" :data="projects" :loading="projectsLoading" />
        <AccountTab  v-else-if="activeTab === 'account'"  :data="account" />
        <PluginTab   v-else-if="activeTab === 'plugin'"   :data="plugins" :loading="pluginsLoading" />
        <AgentsTab   v-else-if="activeTab === 'agents'"   :data="agents" />
        <McpTab      v-else-if="activeTab === 'mcp'"      :data="mcp" />
        <StatsTab    v-else-if="activeTab === 'stats'"    :data="stats" />
        <HistoryTab  v-else-if="activeTab === 'history'"  :data="history" />
        <SkillsTab   v-else-if="activeTab === 'skills'"   :data="skills" />
        <PlansTab    v-else-if="activeTab === 'plans'"    :data="plans" />
        <MemoryTab   v-else-if="activeTab === 'memory'"   :data="memory" @refresh="loaders.memory()" />
        <SettingsTab v-else-if="activeTab === 'settings'" :data="settings" @refresh="loaders.settings()" />
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import {
  BarChart3,
  Bot,
  Clock3,
  FolderKanban,
  Globe2,
  History,
  Map,
  MessageSquare,
  Plug,
  ScrollText,
  Settings,
  Sparkles,
  User,
} from 'lucide-vue-next';
import './ui.css';

import ChatTab from './tabs/ChatTab.vue';
import ConversationsTab from './tabs/ConversationsTab.vue';
import ProjectsTab from './tabs/ProjectsTab.vue';
import AccountTab from './tabs/AccountTab.vue';
import PluginTab from './tabs/PluginTab.vue';
import AgentsTab from './tabs/AgentsTab.vue';
import McpTab from './tabs/McpTab.vue';
import StatsTab from './tabs/StatsTab.vue';
import HistoryTab from './tabs/HistoryTab.vue';
import SkillsTab from './tabs/SkillsTab.vue';
import PlansTab from './tabs/PlansTab.vue';
import MemoryTab from './tabs/MemoryTab.vue';
import SettingsTab from './tabs/SettingsTab.vue';
import Onboarding from './Onboarding.vue';

const tabs = [
  { id: 'chat',     icon: MessageSquare, label: '新对话' },
  { id: 'conversations', icon: History, label: '对话历史' },
  { id: 'projects', icon: FolderKanban, label: '项目' },
  { id: 'memory',   icon: ScrollText, label: 'CLAUDE.md' },
  { id: 'plans',    icon: Map, label: '计划' },
  { id: 'history',  icon: Clock3, label: '命令历史' },
  { id: 'skills',   icon: Sparkles, label: '技能' },
  { id: 'plugin',   icon: Plug, label: '插件' },
  { id: 'agents',   icon: Bot, label: 'Agents' },
  { id: 'mcp',      icon: Globe2, label: 'MCP' },
  { id: 'stats',    icon: BarChart3, label: '统计' },
  { id: 'settings', icon: Settings, label: '设置' },
  { id: 'account',  icon: User, label: '账户' }
];

const activeTab = ref('chat');
const cliStatus = ref(null);
const checkingStatus = ref(false);
const loadSessionId = ref('');
const chatKey = ref(0);

function pickTab(id) {
  // 点击「新对话」tab 时:总是开一个全新会话(remount)
  if (id === 'chat') {
    loadSessionId.value = '';
    chatKey.value += 1;
  }
  activeTab.value = id;
}

// 普通鼠标滚轮 → 横向滚动 tab 条 (触控板已经原生支持横向)
function onTabsWheel(e) {
  if (e.deltaY === 0 || e.deltaX !== 0) return;
  e.currentTarget.scrollLeft += e.deltaY;
}

function onOpenConversation(sessionId) {
  loadSessionId.value = sessionId;
  // 切回 chat,但要 remount 让 prop 生效
  chatKey.value += 1;
  activeTab.value = 'chat';
}

const stats = ref(null);
const history = ref(null);
const account = ref(null);
const settings = ref(null);
const agents = ref(null);
const mcp = ref(null);
const plans = ref(null);
const skills = ref(null);
const plugins = ref(null);
const pluginsLoading = ref(false);
const memory = ref(null);
const projects = ref(null);
const projectsLoading = ref(false);

const loaders = {
  stats: async () => { stats.value = await (await fetch('/apps/claude-code/stats')).json(); },
  history: async () => { history.value = await (await fetch('/apps/claude-code/history?limit=300')).json(); },
  account: async () => { account.value = await (await fetch('/apps/claude-code/account')).json(); },
  settings: async () => { settings.value = await (await fetch('/apps/claude-code/settings')).json(); },
  agents: async () => { agents.value = await (await fetch('/apps/claude-code/agents')).json(); },
  mcp: async () => { mcp.value = await (await fetch('/apps/claude-code/mcp')).json(); },
  plans: async () => { plans.value = await (await fetch('/apps/claude-code/plans')).json(); },
  skills: async () => { skills.value = await (await fetch('/apps/claude-code/skills')).json(); },
  memory: async () => { memory.value = await (await fetch('/apps/claude-code/memory')).json(); },
  plugin: async () => {
    pluginsLoading.value = true;
    try { plugins.value = await (await fetch('/apps/claude-code/plugins')).json(); }
    finally { pluginsLoading.value = false; }
  },
  projects: async () => {
    projectsLoading.value = true;
    try { projects.value = await (await fetch('/apps/claude-code/projects')).json(); }
    finally { projectsLoading.value = false; }
  }
};

watch(activeTab, (t) => {
  const fn = loaders[t];
  if (fn) fn();
});

const fetchStatus = async () => {
  checkingStatus.value = true;
  try {
    const r = await fetch('/apps/claude-code/status');
    cliStatus.value = await r.json();
  } catch {
    cliStatus.value = { installed: false };
  } finally {
    checkingStatus.value = false;
  }
};

onMounted(fetchStatus);
</script>

<style scoped>
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }

/* topbar */
.topbar { flex: none; height: 64px; display: flex; align-items: center; padding: 8px 16px; background: var(--bg); }
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
@media (max-width: 720px) { .topbar { padding: 8px; height: 56px; } .topbar .brand .name { font-size: 17px; } }

/* Material 3 风 chip 式 tab 条 */
.cc-tabs {
  flex: none;
  display: flex; align-items: center;
  gap: 6px;
  padding: 0 16px 6px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(60,64,67,0.25) transparent;
}
.cc-tabs::-webkit-scrollbar { height: 6px; }
.cc-tabs::-webkit-scrollbar-track { background: transparent; }
.cc-tabs::-webkit-scrollbar-thumb { background: rgba(60,64,67,0.18); border-radius: 3px; }
.cc-tabs::-webkit-scrollbar-thumb:hover { background: rgba(60,64,67,0.35); }
.cc-tab {
  display: inline-flex; align-items: center; gap: 6px;
  flex: none;
  height: 34px; padding: 0 14px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--text-2);
  border-radius: 17px;
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
  white-space: nowrap;
}
.cc-tab:hover { background: var(--bg-elev); color: var(--text); }
.cc-tab.active {
  background: var(--accent-soft);
  color: var(--accent-fg);
  border-color: transparent;
}
.cc-tab-ic { flex: none; }

/* 内容白卡 */
.pane {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  background: #fff;
  border-radius: 16px;
  margin: 0 8px 8px 8px;
  overflow: hidden;
}
.onboarding-pane { padding: 32px; align-items: center; justify-content: center; }
@media (max-width: 720px) {
  .pane { margin: 4px; border-radius: 12px; }
  .cc-tabs { padding: 0 8px 6px; }
}
</style>
