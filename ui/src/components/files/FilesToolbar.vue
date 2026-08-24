<script setup>
import { ref, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFilesStore } from '@/stores/files';
import { useToastStore } from '@/stores/toast';
import { useFileStars } from '@/composables/useFileStars.js';

const files = useFilesStore();
const toast = useToastStore();
const { isCurrentStarred, toggleCurrent: toggleStar } = useFileStars();
const router = useRouter();
const route = useRoute();

const fileInputEl = ref(null);
const searchInputEl = ref(null);
const showSearch = ref(false);
const showSortMenu = ref(false);

function triggerUpload() { fileInputEl.value?.click(); }
function onFileSelect(e) {
    const list = e.target.files;
    if (list?.length) files.uploadFiles(list);
    e.target.value = '';
}

async function toggleSearch() {
    showSearch.value = !showSearch.value;
    if (!showSearch.value) {
        files.filterText = '';
    } else {
        await nextTick();
        searchInputEl.value?.focus();
    }
}

async function openInTerminal() {
    if (!files.cwd) return;
    try {
        await navigator.clipboard?.writeText(`cd "${files.cwd.replace(/"/g, '\\"')}"`);
        toast.show('已复制 cd 命令,去终端粘贴');
    } catch {
        toast.show(files.cwd);
    }
    router.push({ path: '/app/terminal', query: route.query });
}

const sortOptions = [
    { by: 'name',  label: '名称' },
    { by: 'size',  label: '大小' },
    { by: 'mtime', label: '修改时间' },
];

function pickSort(by) {
    files.setSort(by);
    showSortMenu.value = false;
}
</script>

<template>
    <div class="toolbar shrink-0">
        <!-- Row 1: actions -->
        <div class="actions">
            <button @click="toggleSearch" class="tb-btn"
                :class="{ 'is-active': showSearch || files.filterText }" title="搜索">
                <span class="msi sm">search</span>
            </button>

            <button @click="files.refresh" class="tb-btn" title="刷新">
                <span class="msi sm">refresh</span>
            </button>

            <div class="relative">
                <button @click="showSortMenu = !showSortMenu" class="tb-btn"
                    :class="{ 'is-active': showSortMenu }" title="排序">
                    <span class="msi sm">sort</span>
                </button>
                <template v-if="showSortMenu">
                    <div class="fixed inset-0 z-40" @click="showSortMenu = false"></div>
                    <div class="sort-menu">
                        <button v-for="opt in sortOptions" :key="opt.by"
                            @click="pickSort(opt.by)"
                            class="sort-item"
                            :class="{ active: files.sortBy === opt.by }">
                            <span>{{ opt.label }}</span>
                            <span v-if="files.sortBy === opt.by" class="dir">
                                {{ files.sortDir === 'asc' ? '↑' : '↓' }}
                            </span>
                        </button>
                    </div>
                </template>
            </div>

            <button @click="files.toggleHidden" class="tb-btn"
                :class="{ 'is-active': files.showHidden }" title="显示/隐藏 dot 文件">
                <span class="msi sm">{{ files.showHidden ? 'visibility' : 'visibility_off' }}</span>
            </button>

            <span class="div-v"></span>

            <button @click="openInTerminal" class="tb-btn" title="在终端 cd 到此目录">
                <span class="msi sm">terminal</span>
            </button>

            <button @click="triggerUpload" class="tb-btn" title="上传到当前目录">
                <span class="msi sm">file_upload</span>
            </button>

            <button @click="files.createFolder" class="tb-btn" title="新建目录">
                <span class="msi sm">create_new_folder</span>
            </button>

            <button @click="files.createFile" class="tb-btn" title="新建空文件">
                <span class="msi sm">note_add</span>
            </button>

            <button @click="files.copyCurrentPath" class="tb-btn" title="复制当前路径">
                <span class="msi sm">content_copy</span>
            </button>

            <button @click="toggleStar" class="tb-btn"
                :class="{ 'is-active': isCurrentStarred }"
                :disabled="!files.cwd"
                :title="isCurrentStarred ? '取消收藏当前目录' : '收藏当前目录'">
                <span class="msi sm">{{ isCurrentStarred ? 'star' : 'star_border' }}</span>
            </button>

            <input ref="fileInputEl" type="file" multiple style="display:none" @change="onFileSelect" />
        </div>

        <!-- 搜索框 -->
        <div v-if="showSearch" class="search-row">
            <span class="msi sm" style="color:var(--color-faint)">search</span>
            <input ref="searchInputEl"
                v-model="files.filterText"
                placeholder="在当前目录内搜索…"
                autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
                class="search-input" />
            <button v-if="files.filterText" @click="files.filterText = ''" class="tb-btn-sm" title="清空">
                <span class="msi sm">close</span>
            </button>
        </div>

        <!-- 面包屑 -->
        <div class="crumbs">
            <button @click="files.goUp" class="tb-btn-sm" title="上一级">
                <span class="msi sm">chevron_left</span>
            </button>
            <button @click="files.goHome" class="tb-btn-sm" title="主目录">
                <span class="msi sm">home</span>
            </button>
            <span class="div-v small"></span>
            <template v-for="(crumb, i) in files.breadcrumbs" :key="i + crumb.path">
                <button @click="files.navigate(crumb.path)" class="crumb-btn">
                    {{ crumb.label }}
                </button>
                <span v-if="i < files.breadcrumbs.length - 1 && crumb.label !== '/'" class="sep">/</span>
            </template>
        </div>
    </div>
</template>

<style scoped>
.toolbar { background: var(--color-bg); }

.actions {
    height: 44px;
    display: flex; align-items: center;
    gap: 2px;
    padding: 0 8px;
    overflow-x: auto;
}
.actions::-webkit-scrollbar { display: none; }

.tb-btn {
    flex-shrink: 0;
    width: 32px; height: 32px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent;
    color: var(--color-muted);
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    transition: background .15s, color .15s;
}
.tb-btn:hover { background: var(--color-bg-hi); color: var(--color-ink); }
.tb-btn.is-active { color: var(--color-accent); background: var(--color-blue-bg); }

.tb-btn-sm {
    flex-shrink: 0;
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent; border: 0;
    color: var(--color-muted);
    border-radius: 6px;
    cursor: pointer;
    transition: color .15s, background .15s;
}
.tb-btn-sm:hover { color: var(--color-ink); background: var(--color-bg-hi); }

.div-v {
    width: 1px;
    height: 18px;
    margin: 0 6px;
    background: var(--color-line);
}
.div-v.small { height: 14px; margin: 0 4px; }

.sort-menu {
    position: absolute; left: 0; top: 100%;
    margin-top: 6px;
    min-width: 160px;
    z-index: 50;
    border-radius: 12px;
    border: 1px solid var(--color-line);
    background: var(--color-bg-elev);
    box-shadow: var(--shadow);
    padding: 4px;
}
.sort-item {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 10px;
    border-radius: 8px;
    border: 0; background: transparent;
    text-align: left; cursor: pointer;
    font-size: 13px;
    color: var(--color-ink);
    transition: background .12s;
}
.sort-item:hover { background: var(--color-bg-hi); }
.sort-item.active { color: var(--color-accent); }
.sort-item .dir { font-size: 12px; }

/* 搜索条 */
.search-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px;
}
.search-input {
    flex: 1; min-width: 0;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--color-line-hi);
    background: var(--color-bg);
    color: var(--color-ink);
    font-size: 13px;
    outline: 0;
    transition: border-color .15s;
}
.search-input::placeholder { color: var(--color-faint); }
.search-input:focus { border-color: var(--color-accent); }

/* 面包屑 */
.crumbs {
    display: flex; flex-wrap: wrap; align-items: center;
    gap: 2px;
    padding: 4px 12px 8px;
}
.crumb-btn {
    padding: 3px 8px;
    border-radius: 6px;
    border: 0; background: transparent;
    color: var(--color-ink);
    font-size: 12.5px;
    cursor: pointer; white-space: nowrap;
    transition: background .12s;
}
.crumb-btn:hover { background: var(--color-bg-hi); }
.sep { font-size: 12px; color: var(--color-faint); }
</style>
