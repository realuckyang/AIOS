<script setup>
import { useFilesStore, humanSize } from '@/stores/files';
const files = useFilesStore();
</script>

<template>
    <div v-if="files.uploadProgress" class="upload">
        <div class="row">
            <span class="name">↑ {{ files.uploadProgress.filename }}</span>
            <span class="size">
                {{ humanSize(files.uploadProgress.loaded) }} / {{ humanSize(files.uploadProgress.total) }}
            </span>
        </div>
        <div class="bar">
            <div class="bar-fill"
                :style="{ width: (files.uploadProgress.total ? (files.uploadProgress.loaded / files.uploadProgress.total * 100) : 100) + '%' }">
            </div>
        </div>
    </div>
</template>

<style scoped>
.upload {
    flex: none;
    padding: 8px 14px;
    background: var(--color-bg-elev);
    border-top: 1px solid var(--color-line);
}
.row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11.5px;
}
.name {
    flex: 1; min-width: 0;
    color: var(--color-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.size {
    flex: none; margin-left: 12px;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
}
.bar {
    margin-top: 6px;
    height: 4px;
    border-radius: 999px;
    background: var(--color-bg-hi);
    overflow: hidden;
}
.bar-fill {
    height: 100%;
    background: var(--color-accent);
    transition: width .2s ease;
}
</style>
