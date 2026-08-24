<template>
  <div class="app-frame">
    <header class="topbar">
      <div class="brand"><span class="name">算一卦</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>
    <div class="flex flex-1 min-h-0 bg-[#e8ddd0] font-['PingFang_SC',serif] text-[#3a2e20]">
    <div class="h-full w-full overflow-y-auto">
      <div class="mx-auto max-w-[460px] px-5 pb-[60px] pt-7">
        <div class="mb-7 text-center">
          <h1 class="font-serif text-[28px] font-black tracking-[0.15em] text-[#5a4020]">算一卦</h1>
          <p class="mt-1 text-xs tracking-[0.2em] text-[#a09070]">JU YI GUA · 心诚则灵</p>
        </div>

        <FortuneHexagramPanel
          :hexagram-name="hexagramName"
          :result="result"
          :display-yaos="displayYaos"
          :yao-labels="yaoLabels"
          :coins="coins"
          :shaking="shaking"
        />

        <FortuneQuestionForm
          v-model:question="question"
          :shaking="shaking"
          :loading="loading"
          @divine="divine"
        />

        <FortuneResultCard :result="result" :format-poem="formatPoem" />
        <FortuneHistoryList :history="history" :result="result" :format-time="formatTime" />

        <div class="mt-10 border-t border-dashed border-[rgba(160,140,110,0.3)] pt-5 text-center">
          <p class="font-['PingFang_SC',sans-serif] text-[11px] leading-[1.8] tracking-[0.05em] text-[#a09070] opacity-80">
            古卦今观,仅供娱乐参考<br>尽人事 · 听天命
          </p>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { LOCALE } from '@/system/locale.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import FortuneHexagramPanel from './FortuneHexagramPanel.vue';
import FortuneQuestionForm from './FortuneQuestionForm.vue';
import FortuneResultCard from './FortuneResultCard.vue';
import FortuneHistoryList from './FortuneHistoryList.vue';

const HEXAGRAM_TABLE = [
  ['坤为地', '地山谦', '地水师', '地风升', '地雷复', '地火明夷', '地泽临', '地天泰'],
  ['山地剥', '艮为山', '山水蒙', '山风蛊', '山雷颐', '山火贲', '山泽损', '山天大畜'],
  ['水地比', '水山蹇', '坎为水', '水风井', '水雷屯', '水火既济', '水泽节', '水天需'],
  ['风地观', '风山渐', '风水涣', '巽为风', '风雷益', '风火家人', '风泽中孚', '风天小畜'],
  ['雷地豫', '雷山小过', '雷水解', '雷风恒', '震为雷', '雷火丰', '雷泽归妹', '雷天大壮'],
  ['火地晋', '火山旅', '火水未济', '火风鼎', '火雷噬嗑', '离为火', '火泽睽', '火天大有'],
  ['泽地萃', '泽山咸', '泽水困', '泽风大过', '泽雷随', '泽火革', '兑为泽', '泽天夬'],
  ['天地否', '天山遁', '天水讼', '天风姤', '天雷无妄', '天火同人', '天泽履', '乾为天']
];

const yaoLabels = computed(() => [
  '上爻',
  '五爻',
  '四爻',
  '三爻',
  '二爻',
  '初爻'
]);

const trigramIndex = (y0, y1, y2) => y0 * 4 + y1 * 2 + y2;

const lookupHexagram = (yaos) => {
  const lower = trigramIndex(yaos[0], yaos[1], yaos[2]);
  const upper = trigramIndex(yaos[3], yaos[4], yaos[5]);
  return HEXAGRAM_TABLE[upper][lower];
};

const question = ref('');
const shaking = ref(false);
const loading = ref(false);
const result = ref(null);
const history = ref([]);
const hexagramName = ref('');
const displayYaos = ref([null, null, null, null, null, null]);
const coins = ref([[], [], [], [], [], []]);

const request = async (url, opts) => {
  const res = await fetch(url, { credentials: 'include', ...opts });
  return res.json();
};

const formatTime = (v) => {
  if (!v) return '';
  return v.replace('T', ' ').slice(5, 16);
};

const formatPoem = (poem) => {
  if (!poem) return '';
  return poem.replace(/[，。；,;]/g, (m) => `${m}<br>`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shakeOnce = () => {
  const c = [Math.random() < 0.5 ? 1 : 0, Math.random() < 0.5 ? 1 : 0, Math.random() < 0.5 ? 1 : 0];
  const sum = c.reduce((s, v) => s + (v ? 2 : 3), 0);
  const isYang = sum === 7 || sum === 9 ? 1 : 0;
  return { coins: c, yao: isYang };
};

const divine = async () => {
  if (!question.value.trim() || shaking.value || loading.value) return;

  result.value = null;
  hexagramName.value = '';
  displayYaos.value = [null, null, null, null, null, null];
  coins.value = [[], [], [], [], [], []];
  shaking.value = true;

  const allYaos = [];
  for (let i = 0; i < 6; i += 1) {
    const { coins: c, yao } = shakeOnce();
    allYaos.push(yao);

    const displayIdx = 5 - i;
    coins.value[displayIdx] = c;
    displayYaos.value[displayIdx] = yao;

    await sleep(500);
  }

  const name = lookupHexagram(allYaos);
  hexagramName.value = name;
  shaking.value = false;

  loading.value = true;
  const lang = LOCALE;
  const yaoDesc = lang === 'en'
    ? allYaos.map((y, i) => `${['1st', '2nd', '3rd', '4th', '5th', 'top'][i]}:${y ? 'yang' : 'yin'}`).join(', ')
    : allYaos.map((y, i) => `${['初', '二', '三', '四', '五', '上'][i]}爻:${y ? '阳' : '阴'}`).join('，');
  const prompt = lang === 'en'
    ? 'Interpret the given hexagram and return JSON by schema.'
    : '请根据给定卦象完成解卦，按 schema 输出 JSON。';
  const systemText = lang === 'en'
    ? `You are a skilled I Ching diviner with elegant writing.
The user has already generated a specific hexagram. Interpret strictly based on this hexagram.

Requirements:
1. signName: overall rating (e.g. Great Fortune / Moderate / Caution)
2. signPoem: an original four-line poem with classical tone
3. good: 2-3 recommended actions, comma-separated
4. bad: 2-3 discouraged actions, comma-separated
5. advice: 80-120 words, practical and grounded, avoid absolute claims, keep entertainment disclaimer tone

Hexagram to interpret: "${name}".

Return JSON only:
{"signName":"...","signPoem":"...","good":"...","bad":"...","advice":"..."}`
    : `你是一位精通周易六爻的卦师，学识渊博、文笔古雅。
用户通过摇铜钱起卦，已经得到了具体的卦象。请基于此卦象为用户解卦。

要求：
1. signName：给出卦象评价（如"大吉"、"中吉"、"小吉"、"中平"、"小凶"、"大凶"）
2. signPoem：写一首原创四句七言签诗，有古韵，切合卦象与问题
3. good：宜做之事（2-3项，逗号分隔）
4. bad：忌做之事（2-3项，逗号分隔）
5. advice：结合卦象和问题给出解读建议（80-120字，有易经味道但通俗实用）。请务必注意言辞不要过于绝对，可适当带入"尽人事，听天命"或"科学理性看待、仅供娱乐参考"的寓意，告诉用户算卦不要太当真。

注意：解读必须紧扣所得卦象"${name}"的卦义，不可随意发挥。

必须返回 JSON：
{"signName":"评价","signPoem":"签诗","good":"宜","bad":"忌","advice":"建议"}`;
  const userText = lang === 'en'
    ? `My question: ${question.value.trim()}\nHexagram: ${name}\nLines (bottom to top): ${yaoDesc}`
    : `我的问题：${question.value.trim()}\n所得卦象：${name}\n爻象（初爻到上爻）：${yaoDesc}`;
  const data = await request('/apps/fortune/divine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question.value.trim(),
      hexagram: name,
      taskTitle: lang === 'en' ? 'I Ching Reading' : '周易解卦',
      prompt,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText }
      ]
    })
  });
  loading.value = false;

  if (data.success) {
    result.value = data.item;
    history.value.unshift(data.item);
    question.value = '';
  }
};

const loadHistory = async () => {
  const data = await request('/apps/fortune/list?page=1&pageSize=30');
  if (data.success) history.value = data.items;
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }

/* ── 拟物化顶栏: 宣纸 + 印章 ── */
.topbar {
  flex: none;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  position: relative;
  z-index: 5;
  background-color: #e8ddd0;
  background-image:
    radial-gradient(ellipse at 50% 100%, rgba(110, 75, 40, 0.18), transparent 70%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.28  0 0 0 0 0.13  0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E");
  box-shadow:
    inset 0 -1px 0 rgba(110, 75, 40, 0.3),
    0 4px 6px -4px rgba(80, 50, 20, 0.25);
}
/* 底部细回纹 (云雷纹简化版) */
.topbar::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 4px;
  background-image: repeating-linear-gradient(90deg,
    rgba(110, 75, 40, 0.55) 0 4px, transparent 4px 6px,
    rgba(110, 75, 40, 0.55) 6px 10px, transparent 10px 14px);
  opacity: 0.35;
  pointer-events: none;
}
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.32em;
  color: #5a4020;
  text-shadow: 0 1px 0 rgba(255, 250, 240, 0.5);
  font-family: 'STKaiti', 'KaiTi', 'PingFang SC', serif;
  /* 朱印挂在标题左侧 */
  padding-left: 22px;
  position: relative;
}
.topbar .brand .name::before {
  content: "卜";
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 18px; height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #fdf3e6;
  background: linear-gradient(135deg, #b73a2a 0%, #8a1f12 100%);
  border-radius: 2px;
  letter-spacing: 0;
  box-shadow:
    inset 0 0 4px rgba(0,0,0,0.35),
    0 1px 2px rgba(0,0,0,0.2);
  text-shadow: none;
}
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.topbar :deep(.icon-btn),
.topbar :deep(button) { color: #5a4020; }
.topbar :deep(.icon-btn:hover),
.topbar :deep(button:hover) { background: rgba(90, 64, 32, 0.1); }

@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 18px; letter-spacing: 0.24em; padding-left: 20px; }
  .topbar .brand .name::before { width: 16px; height: 16px; font-size: 9px; }
}
</style>
