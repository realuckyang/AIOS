<template>
  <div class="lcd-screen">
    <div v-if="isLoading" class="lcd-content lcd-loading">
      <div>{{ toast }}<span class="blink-cursor">▮</span></div>
      <div class="lcd-progress">
        <span class="lcd-progress-bar"></span>
      </div>
    </div>
    <div v-else-if="timeLine.length > 0" class="lcd-content" v-html="timeLine[currentIndex].content"></div>

    <!-- 空白状态: 像素风锁屏壁纸 -->
    <div v-else class="lcd-content lcd-lock">
      <!-- 顶部状态条 -->
      <div class="lock-status">
        <span class="signal">
          <i></i><i></i><i></i><i></i>
        </span>
        <span class="carrier">BANANA</span>
        <span class="battery"><i></i></span>
      </div>

      <!-- 时间 -->
      <div class="lock-time">{{ clock }}</div>
      <div class="lock-date">{{ date }}</div>

      <!-- 像素香蕉 -->
      <pre class="pixel-banana">{{ banana }}</pre>

      <div class="lock-hint">▶ 选择下方按键 ◀</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

defineProps({
  isLoading: { type: Boolean, required: true },
  toast: { type: String, required: true },
  timeLine: { type: Array, required: true },
  currentIndex: { type: Number, required: true }
});

// ── 锁屏: 实时时钟 + 日期 ──
const now = ref(new Date());
let timer = null;
onMounted(() => { timer = setInterval(() => { now.value = new Date(); }, 1000); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

const pad = (n) => String(n).padStart(2, '0');
const clock = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`);
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const date = computed(() => `${now.value.getMonth() + 1} 月 ${now.value.getDate()} 日 · ${WEEK[now.value.getDay()]}`);

// 像素 ASCII 香蕉
const banana = `      ░▒▓█▓▒░
    ░▒▓██▓▒░
   ▒▓███▓▒
  ▒▓████▓▒
 ▒▓█████▓▒
▒▓██████▓▒
▒▓██████▓▒░
 ▒▓█████▓▒░
   ░▒▓██▓▒░
      ░▒░`;
</script>

<style scoped>
/* ── 像素锁屏 ── */
.lcd-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px 10px;
  font-family: 'Courier New', Courier, monospace;
  color: #1e2a18;
  min-height: 180px;
}

/* 顶部状态条 */
.lock-status {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.lock-status .signal {
  display: inline-flex;
  align-items: flex-end;
  gap: 1px;
}
.lock-status .signal i {
  display: inline-block;
  width: 2px;
  background: #1e2a18;
}
.lock-status .signal i:nth-child(1) { height: 3px; }
.lock-status .signal i:nth-child(2) { height: 5px; }
.lock-status .signal i:nth-child(3) { height: 7px; }
.lock-status .signal i:nth-child(4) { height: 9px; opacity: 0.35; }
.lock-status .battery {
  position: relative;
  width: 18px; height: 9px;
  border: 1px solid #1e2a18;
  border-radius: 1px;
  padding: 1px;
}
.lock-status .battery::after {
  content: "";
  position: absolute;
  right: -3px; top: 2px;
  width: 2px; height: 3px;
  background: #1e2a18;
}
.lock-status .battery i {
  display: block;
  width: 70%;
  height: 100%;
  background: #1e2a18;
}

/* 时间 */
.lock-time {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  margin: 4px 0 2px;
  text-shadow: 1px 1px 0 rgba(30, 42, 24, 0.18);
}
.lock-date {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 4px;
  opacity: 0.85;
}

/* ASCII 香蕉 */
.pixel-banana {
  margin: 2px 0 6px;
  padding: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0;
  color: #1e2a18;
  white-space: pre;
  text-align: center;
  filter: drop-shadow(0 1px 0 rgba(30, 42, 24, 0.2));
}

.lock-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  opacity: 0.7;
  animation: blink 1.4s steps(2) infinite;
}
@keyframes blink {
  50% { opacity: 0.25; }
}
</style>
