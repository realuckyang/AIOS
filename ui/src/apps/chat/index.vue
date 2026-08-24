<script setup>
// chat 应用根 — 协调器, 不直接渲染消息内容
// ────────────────────────────────────────
//   stream.js     ← WS 监听 + parseMessages
//   Sidebar.vue   ← 历史 / 新对话
//   Header.vue    ← 标题 + 备注 / 更多浮层
//   Messages.vue  ← 消息流 (派发到 bubbles/)
//   Composer.vue  ← 输入条 + 附件 + 上传
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useViewStore } from '@/stores/view.js';
import * as api from '@/utils/api.js';
import { send } from '@/system/ws.js';
import AppsTrigger from '@/components/AppsTrigger.vue';

import Sidebar from './Sidebar.vue';
import Header from './Header.vue';
import Messages from './Messages.vue';
import Composer from './Composer.vue';
import { setupChatStream, parseMessages, mkKey } from './stream.js';

const props = defineProps({
  pendingMessage: { type: String, default: null },
  intentRequest: { type: Object, default: null }
});

const view = useViewStore();
const MOBILE_BREAK = 720;

// ─── state ─────────────────────────────────────────
const conversations = ref([]);
const activeId = ref(null);
const messages = ref([]);
const input = ref('');
const streaming = ref(false);
const streamingKey = ref('');
const errMsg = ref('');

// 拖拽到主区(由父级管理, 因为 drop 区是整个 chat-pane)
const dragActive = ref(false);
let dragCounter = 0;

// 备注面板数据
const remarks = ref([]);
const remarksLoading = ref(false);

// 子组件引用
const messagesRef = ref(null);
const composerRef = ref(null);

// ─── computed ──────────────────────────────────────
const activeConv = computed(() => conversations.value.find((c) => c.conversation_id === activeId.value) || null);
const activeTitle = computed(() => activeConv.value?.title || (activeId.value ? '对话' : '新对话'));
const canSend = computed(() => {
  const hasFiles = composerRef.value?.pendingFiles?.length > 0;
  return (input.value.trim() || hasFiles) && !streaming.value;
});

// ─── helpers ───────────────────────────────────────
const isMobile = () => window.innerWidth < MOBILE_BREAK;
const setErr = (label, e) => { errMsg.value = `${label}: ${e?.message || e}`; };
const scrollEnd = () => messagesRef.value?.scrollEnd();

// ─── 对话操作 ──────────────────────────────────────
async function loadConversations() {
  try {
    const list = await api.get('/api/chat/list', { query: { scene: 'chat' } });
    conversations.value = (list || []).map((c) => ({ ...c, _last: c.description || '' }));
    if (!activeId.value && conversations.value.length) {
      await pickConv(conversations.value[0].conversation_id);
    }
  } catch (e) { setErr('加载对话列表失败', e); }
}

async function pickConv(id) {
  if (!id) return;
  activeId.value = id;
  messages.value = [];
  streamingKey.value = '';
  if (isMobile()) view.closeAppDrawer();
  try {
    const data = await api.get('/api/chat/messages', { query: { conversationId: id, limit: 50, offset: 0 } });
    messages.value = parseMessages(data.messages || []);
    streaming.value = data.state === 'running';
    scrollEnd();
  } catch (e) { setErr('加载消息失败', e); }
}

function newChat() {
  // 只重置 UI 状态;真正的会话等用户发第一条消息时才创建,标题用消息前 30 字
  activeId.value = null;
  messages.value = [];
  streamingKey.value = '';
  streaming.value = false;
  errMsg.value = '';
  if (isMobile()) view.closeAppDrawer();
}

async function sendMsg() {
  const t = input.value.trim();
  const files = composerRef.value?.pendingFiles?.slice() || [];
  if ((!t && !files.length) || streaming.value) return;

  const content = t || '请先阅读附件并总结关键信息';

  if (!activeId.value) {
    try {
      const title = (t || files[0]?.name || '新对话').slice(0, 30);
      const c = await api.post('/api/chat/create', { title, scene: 'chat' });
      activeId.value = c.conversationId || c.conversation_id;
      await loadConversations();
    } catch (e) { setErr('新建对话失败', e); return; }
  }

  const outgoing = files.map((f) => ({ type: 'file', name: f.name, path: f.path, size: f.size }));
  messages.value.push({ role: 'user', text: t, attachments: outgoing, _key: mkKey('u') });
  input.value = '';
  composerRef.value?.clearFiles();
  streaming.value = true;
  nextTick(() => composerRef.value?.resetTextareaHeight());
  scrollEnd();
  send({ type: 'message', conversationId: activeId.value, content, attachments: outgoing });
}

function abort() {
  if (!streaming.value || !activeId.value) return;
  send({ type: 'abort', conversationId: activeId.value });
}

async function renameCurrent() {
  if (!activeId.value) return;
  const t = prompt('新标题', activeConv.value?.title || '');
  if (t === null) return;
  const title = t.trim();
  if (!title) return;
  try {
    await api.post('/api/chat/rename', { conversationId: activeId.value, title });
    await loadConversations();
  } catch (e) { setErr('改名失败', e); }
}

async function deleteCurrent() {
  if (!activeId.value) return;
  if (!confirm('删除这个对话?此操作不可撤销。')) return;
  try {
    await api.post('/api/chat/delete', { conversationId: activeId.value });
    activeId.value = null;
    messages.value = [];
    await loadConversations();
  } catch (e) { setErr('删除失败', e); }
}

async function loadRemarks() {
  if (!activeId.value) return;
  remarksLoading.value = true;
  try {
    const data = await api.get('/api/chat/remarks', { query: { conversationId: activeId.value } });
    remarks.value = data?.items || [];
  } catch { remarks.value = []; }
  remarksLoading.value = false;
}

// ─── 拖拽到主区 ───────────────────────────────────
const hasDraggedFiles = (e) => !!e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files');
function onDragEnter(e) {
  if (!hasDraggedFiles(e) || streaming.value) return;
  dragCounter += 1;
  dragActive.value = true;
}
function onDragOver(e) {
  if (!hasDraggedFiles(e) || streaming.value) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}
function onDragLeave(e) {
  if (!hasDraggedFiles(e)) return;
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) dragActive.value = false;
}
async function onDrop(e) {
  e.preventDefault();
  dragCounter = 0;
  dragActive.value = false;
  if (streaming.value) return;
  await composerRef.value?.addFiles(Array.from(e.dataTransfer?.files || []));
}

// ─── 生命周期 ──────────────────────────────────────
let stopStream = null;

onMounted(() => {
  stopStream = setupChatStream({
    messages, activeId, streaming, streamingKey,
    onAfterDone: loadConversations,
    scrollEnd
  });

  loadConversations();

  // workshop 等过来:自动新建并发送
  const ir = props.intentRequest;
  if (ir?.intent === 'new_and_send' && ir.payload?.message) {
    nextTick(async () => {
      activeId.value = null;
      messages.value = [];
      input.value = ir.payload.message;
      await sendMsg();
    });
  } else if (props.pendingMessage) {
    nextTick(() => { input.value = props.pendingMessage; });
  }
});

onBeforeUnmount(() => {
  stopStream?.();
});
</script>

<template>
  <div class="flex flex-1 flex-col min-w-0 min-h-0 bg-bg">

    <!-- ─── 顶栏 ─── -->
    <header class="flex h-16 flex-none items-center px-4 bg-bg max-md:h-14 max-md:px-2">
      <button
        class="icon-btn lg"
        :class="{ active: view.appDrawerOpen }"
        title="侧栏"
        @click="view.toggleAppDrawer()">
        <span class="msi">menu</span>
      </button>
      <div class="ml-3 mr-1 min-w-0 flex-1 truncate text-[20px] font-medium tracking-[-0.01em] text-ink max-md:text-[17px]">
        {{ activeTitle }}
      </div>
      <div class="ml-auto flex items-center gap-1">
        <Header
          :has-active="!!activeId"
          :remarks="remarks"
          :remarks-loading="remarksLoading"
          @rename="renameCurrent"
          @delete="deleteCurrent"
          @load-remarks="loadRemarks" />
        <AppsTrigger />
      </div>
    </header>

    <!-- ─── 侧栏 + 主区 ─── -->
    <div class="relative flex flex-1 min-w-0 min-h-0 bg-[#f0f4f9]">

      <!-- 移动端 drawer 展开时的遮罩(只覆盖 chat-shell 内部, 不挡 topbar) -->
      <Transition name="backdrop">
        <div v-if="view.appDrawerOpen"
          class="absolute inset-0 z-40 hidden bg-black/40 max-[720px]:block"
          @click="view.closeAppDrawer()"></div>
      </Transition>

      <!-- 侧栏 -->
      <aside class="app-side !bg-[#f0f4f9] !border-r-0"
        :class="{ collapsed: !view.appDrawerOpen }">
        <Sidebar
          :conversations="conversations"
          :active-id="activeId"
          @pick="pickConv"
          @new-chat="newChat" />
      </aside>

      <!-- 主区(白卡) -->
      <section class="relative flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden rounded-2xl m-2 ml-0 bg-white max-md:m-0 max-md:rounded-none"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop">

        <!-- 错误条 -->
        <div v-if="errMsg"
          class="mx-6 mb-2 flex-none rounded-lg bg-[#fce8e6] px-3 py-2 text-[12.5px] text-bad">
          {{ errMsg }}
        </div>

        <Messages
          ref="messagesRef"
          :messages="messages"
          :streaming="streaming"
          :has-active="!!activeId"
          :err-msg="errMsg"
          @pick="(t) => { input = t; nextTick(() => composerRef?.focus?.()); }" />

        <Composer
          ref="composerRef"
          v-model="input"
          :streaming="streaming"
          :can-send="canSend"
          @send="sendMsg"
          @abort="abort" />

        <!-- 拖拽到主区时的浮层提示 -->
        <Transition name="backdrop">
          <div v-if="dragActive"
            class="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent/5 text-[14px] font-medium text-accent-fg">
            松开即可作为附件加入对话
          </div>
        </Transition>
      </section>
    </div>
  </div>
</template>

<style scoped>
.backdrop-enter-active, .backdrop-leave-active { transition: opacity .18s ease; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }
</style>
