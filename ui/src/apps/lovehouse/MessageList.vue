<script setup>
defineProps({
  messages: { type: Array, default: () => [] },
  sending:  { type: Boolean, default: false }
});
</script>

<template>
  <div class="flex flex-col gap-4 pb-28">
    <template v-for="msg in messages" :key="msg.id">
      <!-- 用户气泡: 实心粉红 -->
      <div v-if="msg.role === 'user'" class="flex justify-end">
        <div class="max-w-[80%] py-2 px-4 text-[15px] leading-relaxed break-words whitespace-pre-wrap
                    bg-pink-500 text-white
                    rounded-2xl rounded-tr-sm
                    shadow-sm shadow-pink-500/20">
          {{ msg.content }}
        </div>
      </div>

      <!-- AI 气泡: 白底 + thought + reply + mood -->
      <div v-else class="flex justify-start">
        <div class="max-w-[80%] py-3 px-4 break-words whitespace-pre-wrap
                    bg-white text-gray-800
                    rounded-2xl rounded-tl-sm
                    border border-pink-100
                    shadow-md">
          <!-- 内心 OS -->
          <div v-if="msg.thought" class="relative pt-6 mb-3 mt-1">
            <span class="absolute top-0 left-0 px-2.5 py-0.5
                         text-[11px] font-medium
                         bg-yellow-100 text-yellow-800 border border-yellow-200
                         rounded-full shadow-sm">
              内心 OS
            </span>
            <div class="text-[13px] italic text-pink-400 leading-snug">
              💭 "{{ msg.thought }}"
            </div>
          </div>

          <!-- 公开回复 -->
          <div class="text-[15px] leading-relaxed text-gray-800">{{ msg.content }}</div>

          <!-- 情绪 chip -->
          <div v-if="msg.mood"
            class="inline-block mt-2 px-2.5 py-0.5
                   text-[11px] font-medium
                   bg-pink-100 text-pink-700 border border-pink-200
                   rounded-full">
            {{ msg.mood }}
          </div>
        </div>
      </div>
    </template>

    <!-- 打字指示器 -->
    <div v-if="sending" class="flex justify-start">
      <div class="inline-flex gap-1.5 py-3.5 px-4
                  bg-white border border-pink-100 shadow-md
                  rounded-2xl rounded-tl-sm">
        <span class="lh-typing-dot size-1.5 rounded-full bg-pink-500/40"></span>
        <span class="lh-typing-dot size-1.5 rounded-full bg-pink-500/40"></span>
        <span class="lh-typing-dot size-1.5 rounded-full bg-pink-500/40"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* keyframes 是 Tailwind 任意值无法表达的部分, 仅保留 4 行 */
@keyframes lh-blink { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
.lh-typing-dot { animation: lh-blink 1.2s infinite; }
.lh-typing-dot:nth-child(2) { animation-delay: .2s; }
.lh-typing-dot:nth-child(3) { animation-delay: .4s; }
</style>
