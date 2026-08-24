<template>
  <div class="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#1a2820_0%,#080d0a_100%)]">
    <PokerTableView
      class="h-full w-full overflow-y-auto"
      :ai-speech="aiSpeech"
      :ai-expression="aiExpression"
      :game="game"
      :economy="economy"
      :display-ai-cards="displayAiCards"
      :round-status-text="roundStatusText"
      :suit-icon="suitIcon"
      :rank-label="rankLabel"
    />
    <!-- 浮在牌桌右上角的应用切换 -->
    <div class="poker-shell-actions pointer-events-auto absolute right-3 top-3 z-50 flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur-md">
      <ChatTrigger />
      <AppsTrigger />
    </div>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      <PokerControlPanel
        class="pointer-events-auto"
        :last-action-text="lastActionText"
        :game="game"
        :busy="busy"
        @start="startGame"
        @action="handleAction"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import PokerControlPanel from './PokerControlPanel.vue';
import PokerTableView from './PokerTableView.vue';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
const game = ref(null);
const busy = ref(false);
const lastActionText = ref('');
const aiSpeech = ref('');
const aiExpression = ref('');
const economy = ref({ playerBalance: 0, aiBalance: 0 });

const suitIcon = (s) => ({ spade: '♠', heart: '♥', diamond: '♦', club: '♣' }[s] || '');
const rankLabel = (r) => r;

const displayAiCards = computed(() => {
  if (!game.value) return [null, null, null];
  return game.value.aiCards;
});

const roundStatusText = computed(() => {
  if (!game.value) return '第 {n} 轮' + '0';
  if (game.value.status === 'done') {
    if (game.value.winner === 'player') return '你赢了这局';
    if (game.value.winner === 'draw') return '平局';
    return 'AI 赢了这局';
  }
  return '第 {n} 轮' + game.value.round;
});

const request = async (url, opts) => {
  const res = await fetch(url, { credentials: 'include', ...opts });
  return res.json();
};

const resolveMessage = (data) => {
  if (data?.messageKey) return data.messageKey;
  const text = String(data?.message || '').trim();
  if (!text) {
    throw new Error('poker api 返回了空 message');
  }
  return text;
};

const loadStatus = async () => {
  const data = await request('/apps/poker/status');
  if (data.success) {
    economy.value = data.economy;
  }
};

onMounted(() => {
  loadStatus();
});

const startGame = async () => {
  busy.value = true;
  try {
    const data = await request('/apps/poker/start', { method: 'POST' });
    if (data.success) {
      game.value = data.game;
      economy.value = data.economy || economy.value;
      lastActionText.value = '你来';
      aiSpeech.value = '';
      aiExpression.value = '';
      return;
    }
    lastActionText.value = resolveMessage(data);
  } catch (error) {
    const text = String(error?.message || '').trim();
    if (!text) throw new Error('poker start failed without error message');
    lastActionText.value = text;
  } finally {
    busy.value = false;
  }
};

const handleAction = async (action) => {
  if (busy.value || !game.value) return;
  busy.value = true;
  aiSpeech.value = 'AI 思考中…';
  aiExpression.value = '';
  if (action === 'fold') lastActionText.value = '已弃牌';
  else if (action === 'raise') lastActionText.value = '已加注,等 AI 出招';
  else lastActionText.value = '已跟注,等 AI 出招';
  try {
    const data = await request('/apps/poker/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: game.value.id, action })
    });
    if (data.success) {
      game.value = data.game;
      economy.value = data.economy || economy.value;
      const aiResponseAction = data.meta?.aiAction || '';
      aiSpeech.value = data.meta?.aiSpeech || '';
      aiExpression.value = data.meta?.aiExpression || '';

      if (game.value.status === 'done') {
        lastActionText.value = '本局结束';
      } else {
        if (aiResponseAction === 'fold') lastActionText.value = 'AI 弃牌';
        else if (aiResponseAction === 'raise') lastActionText.value = 'AI 加注'.replace('{0}', data.meta?.aiBet ?? '');
        else lastActionText.value = 'AI 跟注'.replace('{0}', data.meta?.aiBet ?? '');
      }
      return;
    }
    aiSpeech.value = '';
    aiExpression.value = '';
    lastActionText.value = resolveMessage(data);
  } catch (error) {
    const text = String(error?.message || '').trim();
    if (!text) throw new Error('poker action failed without error message');
    aiSpeech.value = '';
    aiExpression.value = '';
    lastActionText.value = text;
  } finally {
    busy.value = false;
  }
};
</script>

<style scoped>
/* 牌桌一般是深色, 让全局 .icon-btn 在这里清晰可读 */
.poker-shell-actions :deep(.icon-btn) { color: rgba(255,255,255,0.9); }
.poker-shell-actions :deep(.icon-btn:hover) { background: rgba(255,255,255,0.15); color: #fff; }
.poker-shell-actions :deep(.icon-btn.active) { background: rgba(255,255,255,0.2); color: #fff; }
</style>
