<script setup>
import { useFilesStore, humanSize } from '@/stores/files';
const files = useFilesStore();

function handle(kind) {
    const e = files.actionSheet;
    if (!e) return;
    files.closeActionSheet();
    if (kind === 'download') files.downloadEntry(e);
    else if (kind === 'rename') files.renameEntry(e);
    else if (kind === 'delete') files.deleteEntry(e);
}
</script>

<template>
    <div v-if="files.actionSheet"
        class="scrim fade-enter"
        @click.self="files.closeActionSheet">
        <div class="sheet sheet-enter safe-bottom">
            <header class="head">
                <div class="title">{{ files.actionSheet.name }}</div>
                <div class="sub">
                    {{ files.actionSheet.type === 'dir' ? '目录' : humanSize(files.actionSheet.size) }}
                </div>
            </header>

            <div class="actions">
                <button v-if="files.actionSheet.type !== 'dir'" class="action" @click="handle('download')">
                    <span class="msi sm">download</span>下载到本地
                </button>
                <button class="action" @click="handle('rename')">
                    <span class="msi sm">drive_file_rename_outline</span>重命名
                </button>
                <button class="action danger" @click="handle('delete')">
                    <span class="msi sm">delete</span>删除
                </button>
            </div>

            <div class="cancel-row">
                <button class="cancel" @click="files.closeActionSheet">取消</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scrim {
    position: fixed; inset: 0; z-index: 50;
    display: flex; align-items: flex-end; justify-content: center;
    background: rgba(31, 31, 31, 0.40);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
}
.sheet {
    width: 100%;
    max-width: 28rem;
    background: var(--color-bg-elev);
    border: 1px solid var(--color-line);
    border-bottom: 0;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
}

.head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--color-line);
}
.title {
    font-size: 14px;
    color: var(--color-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sub {
    font-size: 11.5px;
    color: var(--color-faint);
    margin-top: 2px;
}

.actions { padding: 6px; }
.action {
    width: 100%;
    display: flex; align-items: center; gap: 12px;
    padding: 11px 12px;
    border: 0; background: transparent; cursor: pointer;
    border-radius: 10px;
    font-size: 14px; text-align: left;
    color: var(--color-ink);
    transition: background .12s;
}
.action:hover { background: var(--color-bg-hi); }
.action .msi.sm { font-size: 18px; color: var(--color-muted); }
.action.danger { color: var(--color-bad); }
.action.danger .msi.sm { color: var(--color-bad); }
.action.danger:hover { background: color-mix(in srgb, var(--color-bad) 8%, transparent); }

.cancel-row {
    padding: 6px;
    border-top: 1px solid var(--color-line);
}
.cancel {
    width: 100%;
    padding: 11px 12px;
    border: 0; background: transparent; cursor: pointer;
    border-radius: 10px;
    font-size: 14px; text-align: center;
    color: var(--color-muted);
    transition: background .12s;
}
.cancel:hover { background: var(--color-bg-hi); color: var(--color-ink); }
</style>
