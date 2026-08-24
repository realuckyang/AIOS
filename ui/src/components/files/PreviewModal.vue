<script setup>
import { useFilesStore, humanSize } from '@/stores/files';
const files = useFilesStore();
</script>

<template>
    <div v-if="files.preview" class="scrim fade-enter" @click.self="files.closePreview">
        <div class="modal sheet-enter sm:animate-none safe-top safe-bottom">
            <header class="head">
                <div class="title-block">
                    <div class="title">{{ files.preview.name }}</div>
                    <div class="meta">{{ files.preview.mime || '未知类型' }} · {{ humanSize(files.preview.size) }}</div>
                </div>
                <div class="actions">
                    <button class="dl-btn" @click="files.downloadPreview">下载</button>
                    <button class="close-btn" @click="files.closePreview">
                        <span class="msi sm">close</span>
                    </button>
                </div>
            </header>

            <div class="body">
                <div v-if="files.preview.kind === 'loading'" class="state">加载中…</div>
                <div v-else-if="files.preview.kind === 'error'" class="state error">{{ files.preview.error }}</div>
                <pre v-else-if="files.preview.kind === 'text'" class="text-view">{{ files.preview.content }}</pre>
                <div v-else-if="files.preview.kind === 'image'" class="image-view">
                    <img :src="files.preview.url" />
                </div>
                <div v-else class="state empty">
                    <span class="msi" style="font-size:36px;color:var(--color-faint)">description</span>
                    <div>无法预览此文件类型</div>
                    <button class="dl-btn-primary" @click="files.downloadPreview">下载查看</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scrim {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: flex-end; justify-content: center;
    background: rgba(31, 31, 31, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}
@media (min-width: 640px) {
    .scrim { align-items: center; }
}

.modal {
    width: 100%;
    max-width: 48rem;
    height: 100%;
    background: var(--color-bg-elev);
    border: 1px solid var(--color-line);
    display: flex; flex-direction: column;
    overflow: hidden;
}
@media (min-width: 640px) {
    .modal { height: 85vh; border-radius: 18px; box-shadow: var(--shadow-lg); }
}

.head {
    flex: none;
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-line);
}
.title-block { min-width: 0; }
.title {
    font-size: 13.5px;
    color: var(--color-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.meta {
    font-size: 11px;
    color: var(--color-faint);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.actions { flex: none; display: flex; align-items: center; gap: 4px; }

.dl-btn {
    padding: 0 12px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid var(--color-line-hi);
    background: var(--color-bg);
    color: var(--color-ink);
    font-size: 12px;
    cursor: pointer;
    transition: background .12s;
}
.dl-btn:hover { background: var(--color-bg-hi); }

.close-btn {
    width: 30px; height: 30px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 0; background: transparent;
    color: var(--color-muted);
    border-radius: 8px;
    cursor: pointer;
    transition: background .12s, color .12s;
}
.close-btn:hover { background: var(--color-bg-hi); color: var(--color-ink); }

.body { flex: 1; min-height: 0; overflow: auto; }

.state {
    height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px;
    padding: 24px;
    color: var(--color-muted);
    font-size: 13px;
}
.state.error { color: var(--color-bad); }

.text-view {
    margin: 0;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-ink);
    white-space: pre-wrap; word-break: break-all;
}
.image-view {
    height: 100%;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
}
.image-view img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.dl-btn-primary {
    padding: 0 16px;
    height: 36px;
    border: 0;
    border-radius: 999px;
    background: var(--color-blue-bg);
    color: var(--color-blue-fg);
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: background .15s;
}
.dl-btn-primary:hover { background: var(--color-blue-soft); }
</style>
