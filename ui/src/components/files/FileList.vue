<script setup>
import { useFilesStore, humanSize, relTime } from '@/stores/files';

const files = useFilesStore();

let pressTimer = null;
let pressTriggered = false;

function onPressStart(entry) {
    pressTriggered = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
        pressTriggered = true;
        files.openActionSheet(entry);
    }, 500);
}
function onPressEnd() { clearTimeout(pressTimer); }
function onClick(entry) {
    if (pressTriggered) { pressTriggered = false; return; }
    files.openEntry(entry);
}

const iconFor = (entry) => {
    if (entry.type === 'dir')  return 'folder';
    if (entry.type === 'link') return 'link';
    return 'description';
};
</script>

<template>
    <div class="flex-1 min-h-0 overflow-y-auto">
        <div v-if="files.loading" class="state">加载中…</div>
        <div v-else-if="files.errorMsg" class="state error">{{ files.errorMsg }}</div>
        <div v-else-if="files.viewEntries.length === 0" class="state">
            {{ files.filterText ? `没有匹配 "${files.filterText}" 的文件` : '(空目录)' }}
        </div>
        <ul v-else class="entries">
            <li v-for="entry in files.viewEntries" :key="entry.name">
                <button class="entry"
                    @click="onClick(entry)"
                    @pointerdown="onPressStart(entry)"
                    @pointerup="onPressEnd"
                    @pointerleave="onPressEnd"
                    @pointercancel="onPressEnd"
                    @contextmenu.prevent="files.openActionSheet(entry)">
                    <span class="ico" :class="`ico-${entry.type}`">
                        <span class="msi sm">{{ iconFor(entry) }}</span>
                    </span>
                    <span class="name">{{ entry.name }}</span>
                    <span v-if="entry.type !== 'dir'" class="size">{{ humanSize(entry.size) }}</span>
                    <span class="time">{{ relTime(entry.mtime) }}</span>
                </button>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.state {
    padding: 60px 16px;
    text-align: center;
    font-size: 13px;
    color: var(--color-muted);
}
.state.error { color: var(--color-bad); }

.entries { list-style: none; margin: 0; padding: 4px 8px; }

.entry {
    width: 100%;
    display: flex; align-items: center; gap: 12px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 0;
    background: transparent;
    text-align: left; cursor: pointer;
    transition: background .12s ease;
}
.entry:hover { background: var(--color-bg-hi); }

.ico {
    width: 26px; height: 26px;
    display: grid; place-items: center;
    flex: none; border-radius: 8px;
}
.ico .msi.sm { font-size: 18px; }
.ico-dir   { color: var(--color-accent); }
.ico-link  { color: var(--color-good); }
.ico-file  { color: var(--color-muted); }

.name {
    flex: 1; min-width: 0;
    font-size: 13.5px;
    color: var(--color-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.size {
    flex: none;
    font-size: 11.5px;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
}
.time {
    flex: none;
    width: 80px;
    text-align: right;
    font-size: 11.5px;
    color: var(--color-faint);
}
</style>
