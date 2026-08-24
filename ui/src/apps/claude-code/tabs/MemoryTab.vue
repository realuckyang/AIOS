<template>
  <div class="h-full overflow-y-auto cc-thin-scroll px-6 py-5 space-y-4">
    <div>
      <div class="text-[17px] font-bold">CLAUDE.md</div>
      <div class="text-[11.5px]" style="color:#6b5a46">Claude 记忆文件 · <span class="cc-mono">{{ data?.dir || '~/.claude' }}</span></div>
    </div>

    <div v-if="!data" class="text-[12px]" style="color:#8a7965">加载中...</div>

    <div v-else-if="!data.files?.length" class="rounded-xl text-center py-12" style="border:1px dashed rgba(140,100,60,0.25);background:rgba(255,255,255,0.4)">
      <div class="text-[14px] font-bold mb-1">还没有记忆文件</div>
      <div class="text-[11.5px] max-w-md mx-auto" style="color:#6b5a46">创建 CLAUDE.md 保存持久项目指引。</div>
      <button class="mt-4 cc-btn-primary rounded-lg px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
        :disabled="creating" @click="createFile">{{ creating ? '创建中...' : '创建 CLAUDE.md' }}</button>
    </div>

    <div v-else class="space-y-3">
      <MemoryFileCard v-for="f in data.files" :key="f.path" :file="f" @saved="$emit('refresh')" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MemoryFileCard from './MemoryFileCard.vue';

defineProps({ data: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const creating = ref(false);

const createFile = async () => {
  creating.value = true;
  try {
    const seed = `# 项目记忆

在这里写给 Claude Code 的长期项目指引。
`;
    const resp = await fetch('/apps/claude-code/memory/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'CLAUDE.md', content: seed })
    });
    const data = await resp.json();
    if (data.ok) emit('refresh');
    else alert(data.error || '创建失败');
  } finally {
    creating.value = false;
  }
};
</script>
