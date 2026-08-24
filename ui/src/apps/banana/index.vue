<template>
  <div class="app-frame">
    <header class="topbar">
      <div class="brand"><span class="name">banana</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <div class="banana-stage flex flex-1 min-h-0 w-full items-center justify-center overflow-hidden bg-[#c8bcac] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_2px,transparent_2px,transparent_8px)] font-['PingFang_SC','Microsoft_YaHei',sans-serif] text-[#3e3223]">
    <div class="relative flex max-h-[calc(100%-32px)] w-[280px] flex-col overflow-hidden rounded-[20px] border border-[#ddd6ce] bg-[#eeebe6] p-[14px] shadow-[inset_0_4px_6px_rgba(255,255,255,0.9),inset_0_-4px_6px_rgba(0,0,0,0.06),0_20px_40px_rgba(80,60,40,0.25),0_6px_12px_rgba(80,60,40,0.12)]">
      <div class="mb-3 flex flex-col items-center">
        <div class="earpiece"></div>
        <div class="font-['Pacifico',cursive] text-[22px] tracking-[2px] text-[#8a7a62] [text-shadow:0_2px_0_rgba(255,255,255,0.6),0_-1px_0_rgba(0,0,0,0.1)]">banana</div>
      </div>
      <BananaScreen
        :is-loading="isLoading"
        :toast="toast"
        :time-line="timeLine"
        :current-index="currentIndex"
      />
      <BananaControls
        :time-line="timeLine"
        :current-index="currentIndex"
        v-model:customOption="customOption"
        :is-choosing="isChoosing"
        @choose="chooseOption"
      />
      <div class="mt-5 border-t-2 border-[#d4ccc0]"></div>
      <div class="mic"></div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { LOCALE } from '@/system/locale.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import BananaControls from './BananaControls.vue';
import BananaScreen from './BananaScreen.vue';

const API_BASE = '/apps/banana';

const currentIndex = ref(0);
const customOption = ref('');
const timeLine = ref([]);
const isLoading = ref(false);
const isChoosing = ref(false);
const toast = ref('');

onMounted(() => {
  init();
});

function goHomePage() {
  timeLine.value = [{
    content: `<div style="text-align:center; font-weight:900; font-size:15px; letter-spacing:3px; margin-bottom:10px;">banana</div>
<div style="text-align:center; font-size:11px; margin-bottom:12px;">━━━━━━━━━━━━</div>
<div style="margin-bottom:3px;">📩 短信收发</div>
<div style="margin-bottom:3px;">📝 记事本</div>
<div style="margin-bottom:3px;">🌊 漂流瓶</div>
<div style="margin-bottom:3px;">🔮 每日占卜</div>
<div style="text-align:center; font-size:11px; margin-top:12px;">━━━━━━━━━━━━</div>
<div style="text-align:center; font-size:11px; margin-top:4px;">▶ 选择功能开始</div>`,
    options: [
      { text: '短信' },
      { text: '记事本' },
      { text: '漂流瓶' },
      { text: '占卜' }
    ],
    choices: null
  }];
  currentIndex.value = 0;
}

async function init() {
  isLoading.value = true;
  toast.value = '开机中';

  try {
    const res = await fetch(`${API_BASE}/progress`);
    const data = await res.json();

    if (data && !data.isNew) {
      timeLine.value = [{
        content: data.current_screen.content,
        options: data.current_screen.options || [],
        choices: null
      }];

      isLoading.value = false;
      return;
    }
  } catch (e) {
    console.error('加载进度失败:', e);
  }

  try {
    const params = buildBananaTaskParams({
      now: '开机界面',
      next: '进入主菜单'
    });
    const result = await api('/generation', {
      now: '开机界面',
      next: '进入主菜单',
      ...params
    });

    if (result.content) {
      timeLine.value.push({
        content: result.content,
        options: result.options || [],
        choices: null
      });

    }
  } catch (e) {
    console.error('初始化失败:', e);
    goHomePage();
  }

  isLoading.value = false;
}

async function chooseOption(option) {
  if (!option.text?.trim()) return;
  if (currentIndex.value !== 0) return;
  if (isChoosing.value) return;

  isChoosing.value = true;
  isLoading.value = true;
  toast.value = `${option.text}...`;

  timeLine.value[currentIndex.value].choices = option.text;

  const history = timeLine.value.slice(1, 3).reverse().map(item => {
    return `${'屏幕：'}${item.content}` + (item.choices ? `${'，选择：'}${item.choices}` : '');
  });

  try {
    const params = buildBananaTaskParams({
      history,
      now: timeLine.value[currentIndex.value].content,
      choices: option.text
    });
    const result = await api('/generation', {
      history,
      now: timeLine.value[currentIndex.value].content,
      choices: option.text,
      ...params
    });

    if (result.content) {
      timeLine.value.unshift({
        content: result.content,
        options: result.options || [],
        choices: null
      });
      currentIndex.value = 0;

    }
  } catch (e) {
    console.error('生成失败:', e);
  }

  customOption.value = '';
  isLoading.value = false;
  isChoosing.value = false;
}

async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await res.json();
}

function buildBananaTaskParams({ history = [], now = '', choices = '', next = '' }) {
  const lang = LOCALE;
  const prompt = lang === 'en'
    ? 'Generate the next old-phone screen by context and return strict JSON.'
    : '根据上下文生成下一屏老手机界面。';
  const systemPrompt = lang === 'en'
    ? `Old-phone UI sim game. Output ONE screen as JSON.

ROLES:
- "content" (HTML) = INFORMATION ONLY shown on the LCD. Pure description.
  DO NOT list any choosable items / menu numbers / "press X" hints inside content.
- "options" (array) = the BUTTONS user can press. 1 to 3 items, each "text" non-empty.
  Buttons render BELOW the screen by the shell — never write them into content.

RULES:
1. HTML inline styles only. No external resources, no <script>.
2. Don't draw signal/battery/time/menu numbers — the phone shell handles that.
3. NO background color, no green/black palette. Plain layout, font-size 12px, line-height 1.6.
4. options length: 1, 2, or 3. NEVER 0, NEVER 4+. Each text concise.

GOOD example (texting screen):
{"content":"<div>From: Mom<br>Hi! Did you eat?</div>","options":[{"text":"Reply"},{"text":"Delete"},{"text":"Back"}]}

BAD example (DON'T DO THIS):
- options with empty text: [{"text":""}]
- choices baked into content: "<div>1. Call 2. SMS 3. Game</div>"  ← put these in options instead`
    : `这是模拟老式手机的互动游戏。输出一屏内容,严格 JSON 格式。

字段定位:
- "content"(HTML)= LCD 上要显示的「信息」纯描述。
  绝对不要在 content 里写"按 X 选 Y"、不要列编号菜单、不要写选项文字。
- "options"(数组)= 用户能按的「按钮」。1 到 3 个,每个 text 非空。
  按钮由外壳渲染在屏幕下面 —— 永远不要把它们塞进 content。

规则:
1. HTML 内联样式,无外部资源,无 <script>。
2. 不要画信号 / 电量 / 时间 / 菜单编号 —— 手机外壳已经有了。
3. 不要设背景色,不要绿黑配色。纯排版,字号 12px,行高 1.6。
4. options 数量 1-3 个,绝不为 0,绝不超过 3 个。text 简短明确,不能空字符串。

正确示例(短信查看屏):
{"content":"<div>来自:妈妈<br>吃饭了吗?</div>","options":[{"text":"回复"},{"text":"删除"},{"text":"返回"}]}

错误示例(千万别这样):
- options 为空字符串: [{"text":""}]
- 把选项塞进 content: "<div>1.通讯录 2.短信 3.游戏</div>" ← 这些应放在 options 里`;
  const userPrompt = next
    ? (lang === 'en'
      ? `Current screen is '''${now}''', next target is '''${next}'''`
      : `当前是'''${now}'''，下一步要'''${next}'''`)
    : (lang === 'en'
      ? `Recent history: '''${JSON.stringify(history || [])}'''; current screen: '''${now}'''; latest choice: '''${choices}'''`
      : `用户最近的操作历史是'''${JSON.stringify(history || [])}'''，当前界面显示的是'''${now}'''，用户最新做出的选择是'''${choices}'''`);
  return {
    prompt,
    taskTitle: lang === 'en' ? 'Banana UI Generation' : '老手机界面生成',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }

/* ── 顶栏: 像门店上方的发光招牌, 暖白灯箱面板悬挂在展台上方 ── */
.app-frame .topbar {
  flex: none;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 18px;
  position: relative;
  z-index: 5;
  /* 暖白灯箱: 顶部偏黄, 中间最亮, 底部回暖 */
  background:
    radial-gradient(ellipse 60% 90% at 50% 60%, rgba(255, 240, 200, 0.55), transparent 70%),
    linear-gradient(180deg, #fff8ec 0%, #ffffff 50%, #fff3dc 100%);
  /* 招牌的存在感: 上沿一道细金边 + 下沿厚阴影投到展台上 */
  border-top: 1px solid rgba(180, 130, 60, 0.25);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(180, 130, 60, 0.18),
    0 6px 14px -4px rgba(0, 0, 0, 0.28),
    0 2px 0 rgba(0, 0, 0, 0.06);
}
/* 灯箱左右两枚悬挂铆钉 */
.app-frame .topbar::before,
.app-frame .topbar::after {
  content: "";
  position: absolute;
  top: 8px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f4dca0 0%, #8a6a30 70%, #3e2e10 100%);
  box-shadow: 0 1px 1px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(0,0,0,0.4);
}
.app-frame .topbar::before { left: 10px; }
.app-frame .topbar::after  { right: 10px; }

.app-frame .topbar .brand {
  flex: 1; min-width: 0;
  margin: 0 4px 0 14px;
  padding-top: 4px;   /* 给上方的铆钉留点呼吸 */
}
.app-frame .topbar .brand .name {
  font-family: 'Pacifico', cursive;
  font-size: 30px;
  letter-spacing: 1.5px;
  /* 蛋黄→琥珀渐变填字, 像霓虹笔写出来的店招 */
  background: linear-gradient(180deg, #f4c340 0%, #d68a1a 60%, #a85e0e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter:
    drop-shadow(0 1px 0 rgba(255, 255, 255, 0.85))
    drop-shadow(0 2px 4px rgba(120, 70, 10, 0.35));
  line-height: 1;
}
.app-frame .topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; padding-top: 4px; }
.app-frame .topbar :deep(.icon-btn),
.app-frame .topbar :deep(button) { color: #6b4a16; }
.app-frame .topbar :deep(.icon-btn:hover),
.app-frame .topbar :deep(button:hover) { background: rgba(180, 130, 60, 0.14); }

@media (max-width: 720px) {
  .app-frame .topbar { height: 56px; padding: 0 14px; }
  .app-frame .topbar .brand .name { font-size: 24px; letter-spacing: 1px; }
  .app-frame .topbar::before { left: 8px; }
  .app-frame .topbar::after  { right: 8px; }
}

.earpiece {
  width: 48px; height: 5px;
  background: linear-gradient(180deg, #5a5048, #3e3830);
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.3);
  position: relative;
  margin-bottom: 8px;
}
.earpiece::before {
  content: '';
  position: absolute;
  top: 1px; left: 6px; right: 6px; height: 2px;
  background: repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #2a2420 2px, #2a2420 3px);
  border-radius: 1px;
}

/* ── LCD 屏幕 ── */
.lcd-screen {
  background-color: #a8b89c;
  border-radius: 8px;
  border: 3px solid #8a857a;
  box-shadow:
    inset 4px 4px 10px rgba(50,65,40,0.45),
    inset -2px -2px 4px rgba(255,255,255,0.4),
    0 2px 0 rgba(255,255,255,0.8);
  position: relative;
  overflow: hidden;
}
.lcd-screen::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px);
  pointer-events: none; z-index: 5;
}

.lcd-content {
  font-family: 'Courier New', Courier, monospace;
  color: #1e2a18;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 700;
  min-height: 180px;
  max-height: 240px;
  overflow-y: auto;
}
.lcd-content :deep(*) {
  background-color: transparent !important;
  color: #1e2a18 !important;
}
.lcd-content::-webkit-scrollbar { width: 3px; }
.lcd-content::-webkit-scrollbar-track { background: transparent; }
.lcd-content::-webkit-scrollbar-thumb { background: rgba(30,42,24,0.3); border-radius: 2px; }

/* ── 加载 ── */
.lcd-loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.blink-cursor {
  animation: blink 0.8s step-end infinite;
  margin-left: 1px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.lcd-progress {
  width: 100%;
  height: 10px;
  border: 1.5px solid #1e2a18;
  border-radius: 2px;
  padding: 1px;
}
.lcd-progress-bar {
  display: block;
  height: 100%;
  width: 0%;
  background: #1e2a18;
  border-radius: 1px;
  animation: progress 2s ease-in-out infinite;
}
@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

/* ── 麦克风 ── */
.mic {
  width: 48px; height: 5px;
  background: linear-gradient(180deg, #5a5048, #3e3830);
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.3);
  margin: 10px auto 0;
  position: relative;
}
.mic::before {
  content: '';
  position: absolute;
  top: 1px; left: 6px; right: 6px; height: 2px;
  background: repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #2a2420 2px, #2a2420 3px);
  border-radius: 1px;
}

::-webkit-scrollbar { display: none; }
</style>
