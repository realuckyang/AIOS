<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },     // input 文本
  streaming: { type: Boolean, default: false },
  canSend: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'send', 'abort']);

const textareaEl = ref(null);
const fileInputEl = ref(null);
const composing = ref(false);

const pendingFiles = ref([]);
const uploading = ref(false);
const uploadError = ref('');

function setText(v) { emit('update:modelValue', v); }
function autoResize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
function onEnter(e) {
  if (composing.value || e.isComposing || e.keyCode === 229) return;
  if (e.shiftKey) return;
  e.preventDefault();
  emit('send');
}

// ─── 上传 ──────────────────────────────────────
async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file, file.name);
  const url = '/api/fs/upload?' + new URLSearchParams({ dir: 'files/uploads/chat' });
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
  if (!res.ok) throw new Error(`上传失败 ${res.status}`);
  const data = await res.json();
  const out = (data.files || [])[0];
  if (!out) throw new Error('上传未返回文件');
  return { name: out.name, path: out.path, size: out.size };
}
async function addFiles(files) {
  if (!files?.length) return;
  uploadError.value = '';
  uploading.value = true;
  try {
    for (const f of files) {
      const u = await uploadFile(f);
      pendingFiles.value.push(u);
    }
  } catch (e) {
    uploadError.value = e?.message || String(e);
  } finally {
    uploading.value = false;
  }
}

function pickFiles() { fileInputEl.value?.click(); }
async function onFileChange(e) {
  await addFiles(Array.from(e.target?.files || []));
  if (fileInputEl.value) fileInputEl.value.value = '';
}
function removeFile(idx) { pendingFiles.value.splice(idx, 1); }

function clearFiles() { pendingFiles.value = []; }
function resetTextareaHeight() {
  if (textareaEl.value) textareaEl.value.style.height = 'auto';
}

function fmtSize(n) {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(v >= 10 || i === 0 ? 0 : 1) + u[i];
}

// 父组件可拿到这些 — 主要给 drag-drop / sendMsg 协作
const focus = () => { textareaEl.value?.focus(); };
defineExpose({ pendingFiles, addFiles, clearFiles, resetTextareaHeight, focus });
</script>

<template>
  <div class="composer-wrap">
    <input ref="fileInputEl" type="file" multiple style="display:none" @change="onFileChange" />

    <!-- 待发送附件 chip 行 -->
    <div v-if="pendingFiles.length || uploadError" class="composer-files">
      <span v-for="(f, idx) in pendingFiles" :key="`${f.path}-${idx}`" class="file-chip">
        <span class="msi xxs">description</span>
        <span class="name">{{ f.name }}</span>
        <span class="size">{{ fmtSize(f.size) }}</span>
        <button type="button" class="x" @click="removeFile(idx)">
          <span class="msi xxs">close</span>
        </button>
      </span>
      <span v-if="uploadError" class="upload-err">{{ uploadError }}</span>
    </div>

    <div class="composer">
      <button type="button" class="tool-btn"
        :disabled="streaming || uploading"
        :title="uploading ? '上传中…' : '上传附件'"
        @click="pickFiles">
        <span class="msi sm">{{ uploading ? 'hourglass_top' : 'attach_file' }}</span>
      </button>
      <textarea
        ref="textareaEl"
        :value="modelValue"
        rows="1"
        :placeholder="streaming ? '进行中…可以中断' : '输入消息 (Enter 发送, Shift+Enter 换行)'"
        :disabled="streaming"
        @input="setText($event.target.value); autoResize()"
        @keydown.enter="onEnter"
        @compositionstart="composing = true"
        @compositionend="composing = false" />
      <button v-if="streaming"
        class="grid h-9 w-9 place-items-center rounded-full border-0 bg-bad text-white transition-colors hover:bg-[#b3271c]"
        title="中断"
        @click="emit('abort')">
        <span class="msi sm !text-white">stop</span>
      </button>
      <button v-else
        class="grid h-9 w-9 place-items-center rounded-full border-0 bg-accent text-white transition-colors hover:bg-accent-hi disabled:cursor-default disabled:opacity-40"
        :disabled="!canSend"
        @click="emit('send')">
        <span class="msi sm !text-white">send</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.composer-wrap {
  flex: none;
  margin: 14px auto;
  width: calc(100% - 32px); max-width: 760px;
}
.composer {
  display: flex; align-items: flex-end; gap: 4px;
  padding: 6px 6px 6px 6px;
  background: #f0f4f9;
  border-radius: 26px;
  transition: background .15s, box-shadow .15s;
}
.composer:focus-within {
  background: #fff;
  box-shadow: 0 0 0 1px var(--line), 0 1px 3px rgba(60, 64, 67, 0.08);
}
.composer textarea {
  flex: 1; min-width: 0;
  border: 0; outline: 0;
  background: transparent;
  padding: 9px 4px;
  font-size: 14px;
  resize: none;
  max-height: 200px;
  line-height: 1.5;
}
.composer textarea:disabled { opacity: 0.6; }
.tool-btn {
  flex: none;
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-2);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.tool-btn:hover:not(:disabled) { background: rgba(60, 64, 67, 0.08); color: var(--text); }
.tool-btn:disabled { opacity: 0.4; cursor: default; }

.composer-files {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 6px;
  padding: 0 4px;
}
.file-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 4px 3px 10px;
  background: var(--bg-elev);
  border-radius: 999px;
  font-size: 12px;
  color: var(--text);
}
.file-chip .msi { color: var(--accent); }
.file-chip .name { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-chip .size { color: var(--text-3); font-family: var(--font-mono); font-size: 10.5px; }
.file-chip .x {
  width: 20px; height: 20px;
  margin-left: 2px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.file-chip .x:hover { background: rgba(60,64,67,0.12); color: var(--text); }
.upload-err {
  flex-basis: 100%;
  font-size: 11.5px;
  color: var(--bad);
  padding: 0 4px;
}

@media (max-width: 720px) {
  .composer-wrap { width: calc(100% - 16px); margin: 10px auto; }
}
</style>
