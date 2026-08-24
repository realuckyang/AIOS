<script setup>
import { computed, onMounted } from 'vue';
import { useViewStore } from '@/stores/view.js';
import { useFilesStore } from '@/stores/files';
import { useFileStars } from '@/composables/useFileStars.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import FilesToolbar from '@/components/files/FilesToolbar.vue';
import FileList from '@/components/files/FileList.vue';
import UploadProgress from '@/components/files/UploadProgress.vue';
import PreviewModal from '@/components/files/PreviewModal.vue';
import ActionSheet from '@/components/files/ActionSheet.vue';

const view = useViewStore();
const files = useFilesStore();
const { stars, removeStar } = useFileStars();

const sep = computed(() => files.pathSep || '/');
const home = computed(() => files.homePath || '');

const shortcuts = computed(() => {
  if (!home.value) return [];
  const j = (sub) => home.value + sep.value + sub;
  return [
    { name: '主目录',   path: home.value,     icon: 'home' },
    { name: '桌面',     path: j('Desktop'),   icon: 'desktop_mac' },
    { name: '下载',     path: j('Downloads'), icon: 'download' },
    { name: '文档',     path: j('Documents'), icon: 'description' },
    { name: '图片',     path: j('Pictures'),  icon: 'image' }
  ];
});

const segments = computed(() => {
  if (!files.cwd) return [];
  const parts = files.cwd.split(sep.value).filter(Boolean);
  const acc = [];
  let p = '';
  for (const s of parts) { p = p + sep.value + s; acc.push({ name: s, path: p }); }
  return acc;
});

function pickShortcut(p) {
  files.navigate(p);
  if (window.innerWidth < 720) view.closeAppDrawer();
}

function basename(p) {
  if (!p) return '';
  const parts = p.split(sep.value).filter(Boolean);
  return parts[parts.length - 1] || p;
}

function onDragOver(e) { e.preventDefault(); files.isDragOver = true; }
function onDragLeave() { files.isDragOver = false; }
function onDrop(e) {
  e.preventDefault();
  files.isDragOver = false;
  const list = e.dataTransfer?.files;
  if (list?.length) files.uploadFiles(list);
}

onMounted(() => {
  files.ensureLoaded?.();
});
</script>

<template>
  <div class="app-frame" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
    <header class="topbar">
      <button class="icon-btn lg" :class="{ active: view.appDrawerOpen }"
        @click="view.toggleAppDrawer()" title="侧栏">
        <span class="msi">menu</span>
      </button>
      <div class="brand"><span class="name">文件</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <div class="app-body">
      <Transition name="mask"><div v-if="view.appDrawerOpen" class="app-side-mask" @click="view.closeAppDrawer()" /></Transition>
      <aside class="app-side" :class="{ collapsed: !view.appDrawerOpen }">
        <div class="app-side-inner">
          <!-- 星标 -->
          <div class="side-section">
            <div class="side-label"><span class="t">星标</span></div>
            <div class="shortcuts">
              <div v-if="!stars.length" class="empty-stars">暂无星标</div>
              <div v-else v-for="p in stars" :key="p"
                class="sc-item starred"
                :class="{ active: files.cwd === p }">
                <button class="sc-link" @click="pickShortcut(p)">
                  <span class="msi sm ic">star</span>
                  <span class="t" :title="p">{{ basename(p) }}</span>
                </button>
                <button class="sc-x" type="button" title="取消收藏"
                  @click.stop="removeStar(p)">
                  <span class="msi xxs">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 快捷 -->
          <div class="side-section">
            <div class="side-label"><span class="t">快捷</span></div>
            <div class="shortcuts">
              <button v-for="s in shortcuts" :key="s.path"
                class="sc-item"
                :class="{ active: files.cwd === s.path }"
                @click="pickShortcut(s.path)">
                <span class="msi sm ic">{{ s.icon }}</span>
                <span class="t">{{ s.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section class="files-pane">
        <FilesToolbar />
        <FileList />
        <UploadProgress />

        <div v-if="files.isDragOver" class="drop-overlay">
          <div class="drop-text">松手放进当前目录</div>
        </div>

        <PreviewModal />
        <ActionSheet />
      </section>
    </div>
  </div>
</template>

<style scoped>
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); position: relative; }

/* topbar */
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: var(--bg);
}
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 17px; }
}

.app-body { flex: 1; min-height: 0; display: flex; }

/* drawer */
.side-section { padding: 12px; }
.side-section + .side-section { padding-top: 4px; }
.side-label {
  display: flex; align-items: center;
  margin: 4px 8px 8px;
  height: 22px;
}
.side-label .t {
  flex: 1;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-2);
  text-transform: uppercase;
}

.shortcuts { display: flex; flex-direction: column; gap: 1px; }
.empty-stars {
  font-size: 11.5px;
  color: var(--text-3);
  padding: 4px 12px 8px;
}
.sc-item {
  display: flex; align-items: center;
  border-radius: 22px;
  font-size: 13.5px;
  color: var(--text);
  transition: background .12s;
}
.sc-item:not(.starred) {
  gap: 12px;
  padding: 9px 12px;
  border: 0; background: transparent;
  cursor: pointer;
}
.sc-item:hover { background: var(--bg-hover); }
.sc-item.active { background: var(--accent-soft); color: var(--accent-fg); }
.sc-item .ic { color: var(--text-2); flex: none; }
.sc-item.active .ic { color: var(--accent-fg); }
.sc-item .t { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-item.starred .sc-link {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px;
  flex: 1; min-width: 0;
  border: 0; background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 22px;
}
.sc-item.starred .sc-link .ic { color: var(--warn); }
.sc-item.starred .sc-x {
  flex: none;
  width: 24px; height: 24px;
  margin-right: 8px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s, background .12s, color .12s;
}
.sc-item.starred:hover .sc-x { opacity: 1; }
.sc-item.starred .sc-x:hover { background: rgba(60,64,67,0.12); color: var(--text); }

/* main */
.files-pane {
  flex: 1; min-width: 0; min-height: 0;
  display: flex; flex-direction: column;
  background: #fff;
  border-radius: 16px;
  margin: 8px 8px 8px 0;
  overflow: hidden;
  position: relative;
}

/* breadcrumb */
.crumbs {
  flex: none;
  display: flex; align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-soft);
  overflow-x: auto;
  scrollbar-width: none;
}
.crumbs::-webkit-scrollbar { display: none; }
.crumb-root, .crumb {
  border: 0; background: transparent;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background .12s, color .12s;
}
.crumb-root:hover, .crumb:hover { background: var(--bg-hover); color: var(--text); }
.crumb-root .msi { color: var(--text-2); }
.crumb-root:hover .msi { color: var(--text); }
.sep { color: var(--text-3); font-size: 12px; user-select: none; }
.counts {
  margin-left: auto;
  flex: none;
  font-size: 11.5px;
  color: var(--text-3);
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  padding-right: 4px;
}

/* drag-drop overlay */
.drop-overlay {
  position: absolute; inset: 0;
  pointer-events: none;
  border: 2px dashed var(--accent);
  background: rgba(26, 115, 232, 0.06);
  border-radius: 12px;
  margin: 8px;
  display: grid; place-items: center;
  z-index: 20;
}
.drop-text {
  font-size: 14px; font-weight: 500;
  color: var(--accent);
  background: #fff;
  padding: 10px 16px;
  border-radius: 20px;
  box-shadow: var(--shadow-2);
}

@media (max-width: 720px) {
  .files-pane { margin: 4px; border-radius: 14px; }
  .crumbs { padding: 8px 12px; }
}
</style>
