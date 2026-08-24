<template>
  <div class="app-frame">
    <header class="topbar">
      <button class="icon-btn lg" :class="{ active: viewStore.appDrawerOpen }"
        title="侧栏" @click="viewStore.toggleAppDrawer()">
        <span class="msi">menu</span>
      </button>
      <div class="brand"><span class="name">RSS 阅读</span></div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <div class="app-body" style="font-family: -apple-system, 'PingFang SC', sans-serif;">
      <Transition name="mask">
        <div v-if="viewStore.appDrawerOpen" class="app-side-mask" @click="viewStore.closeAppDrawer()" />
      </Transition>

      <!-- 侧栏:Material 3 风导航 -->
      <aside class="app-side"
        :class="{ collapsed: !viewStore.appDrawerOpen }">
        <div class="app-side-inner">

          <!-- 顶级入口:已阅 + 收藏 -->
          <div class="flex flex-col gap-1 px-3 pt-3.5 pb-2">
            <button class="rss-nav"
              :class="{ active: currentView === 'read' }"
              @click="showRead">
              <span class="msi sm">history</span>
              <span class="rss-nav-label">已阅</span>
              <span v-if="readHistory.length" class="rss-nav-count">{{ readHistory.length }}</span>
            </button>
            <button class="rss-nav"
              :class="{ active: currentView === 'bookmarks' }"
              @click="showBookmarks">
              <span class="msi sm">{{ currentView === 'bookmarks' ? 'bookmark' : 'bookmark_border' }}</span>
              <span class="rss-nav-label">收藏</span>
              <span v-if="bookmarks.length" class="rss-nav-count">{{ bookmarks.length }}</span>
            </button>
          </div>

          <div class="rss-divider"></div>

          <!-- 订阅源 section label -->
          <div class="rss-section-label">订阅</div>

          <!-- Feed list -->
          <div class="flex-1 min-h-0 overflow-y-auto px-2 pb-1">
            <button v-for="feed in feeds" :key="feed.id"
              class="rss-feed-item group"
              :class="{ active: activeFeed?.id === feed.id && currentView === 'articles' }"
              @click="openFeed(feed)">
              <span class="rss-feed-avatar">
                <img v-if="faviconUrl(feed.url)" :src="faviconUrl(feed.url)" :alt="feed.name"
                  referrerpolicy="no-referrer" loading="lazy"
                  @error="onFaviconError" />
                <span class="msi sm rss-feed-fallback">rss_feed</span>
              </span>
              <span class="rss-feed-name">{{ feed.name }}</span>
              <span class="rss-feed-x" @click.stop="doRemoveFeed(feed.id)">
                <span class="msi xxs">close</span>
              </span>
            </button>
          </div>

          <!-- 添加订阅源 -->
          <div class="rss-add-section">
            <button v-if="!showAdd" class="rss-add-btn" @click="showAdd = true">
              <span class="msi sm">add</span>
              <span>添加订阅源</span>
            </button>
            <div v-else class="rss-add-form">
              <input v-model="newUrl" class="rss-add-input"
                :placeholder="'RSS / Atom 链接'"
                @keydown.enter="doAddFeed" />
              <input v-model="newName" class="rss-add-input"
                :placeholder="'名称(选填)'" />
              <div class="flex gap-1.5">
                <button class="rss-add-cancel"
                  @click="showAdd = false; newUrl = ''; newName = ''">取消</button>
                <button class="rss-add-confirm" @click="doAddFeed">添加</button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <section class="flex-1 min-w-0 flex flex-col overflow-hidden bg-bg">
        <!-- 标题条 -->
        <div v-if="activeFeed || currentView === 'bookmarks' || currentView === 'read'" class="rss-pane-head">
          <span class="msi sm rss-pane-icon">{{
            currentView === 'bookmarks' ? 'bookmark'
            : currentView === 'read' ? 'history'
            : 'rss_feed'
          }}</span>
          <div class="rss-pane-title">{{
            currentView === 'bookmarks' ? '收藏'
            : currentView === 'read' ? '已阅'
            : activeFeed?.name
          }}</div>
          <span v-if="currentView === 'bookmarks' && bookmarks.length" class="rss-pane-count">{{ bookmarks.length }}</span>
          <span v-else-if="currentView === 'read' && readHistory.length" class="rss-pane-count">{{ readHistory.length }}</span>
          <span v-else-if="currentView === 'articles' && articles.length" class="rss-pane-count">{{ articles.length }}</span>
          <button v-if="currentView === 'read' && readHistory.length"
            class="rss-pane-clear" @click="clearReadHistory" title="清空已阅历史">
            <span class="msi sm">delete_sweep</span>
          </button>
        </div>

        <!-- 空态 -->
        <div v-if="currentView === 'empty'" class="flex-1 flex flex-col items-center justify-center text-text-3 gap-3">
          <span class="msi" style="font-size:48px;opacity:0.4">rss_feed</span>
          <div class="text-sm">选择左侧订阅源开始阅读</div>
        </div>

        <!-- Article list -->
        <div v-if="currentView === 'articles'" class="flex-1 overflow-y-auto">
          <div v-if="articlesLoading" class="text-center text-text-3 text-sm py-12">加载中…</div>
          <article v-for="item in articles" :key="item.url" class="rss-article">
            <a :href="item.url" target="_blank" class="rss-article-title">{{ item.title }}</a>
            <p class="rss-article-desc">{{ item.description }}</p>
            <div class="rss-article-meta">
              <span class="rss-article-date">{{ item.pubDate }}</span>
            </div>

            <!-- AI 摘要卡 -->
            <div v-if="summaries[item.url]" class="rss-summary-card">
              <div class="rss-summary-label">
                <span class="msi xs">auto_awesome</span>
                <span>AI 摘要</span>
              </div>
              <div class="rss-summary-body" v-html="renderMd(summaries[item.url])"></div>
            </div>

            <!-- 操作 chip 行 -->
            <div class="rss-actions">
              <button v-if="!summaries[item.url]" class="rss-chip rss-chip-primary"
                :disabled="summarizingUrl === item.url"
                @click="doSummarize(item)">
                <span class="msi xs">{{ summarizingUrl === item.url ? 'hourglass_top' : 'auto_awesome' }}</span>
                <span>{{ summarizingUrl === item.url ? 'AI 思考中…' : 'Quick Look' }}</span>
              </button>
              <button class="rss-chip"
                :class="{ 'rss-chip-saved': isSaved(item.url) }"
                @click="toggleSave(item)">
                <span class="msi xs">{{ isSaved(item.url) ? 'bookmark' : 'bookmark_border' }}</span>
                <span>{{ isSaved(item.url) ? '已收藏' : '收藏' }}</span>
              </button>
            </div>
          </article>
        </div>

        <!-- 已阅历史 list -->
        <div v-if="currentView === 'read'" class="flex-1 overflow-y-auto">
          <div v-if="!readHistory.length" class="flex flex-col items-center justify-center text-text-3 gap-3 py-20">
            <span class="msi" style="font-size:40px;opacity:0.4">history</span>
            <div class="text-sm">还没有 Quick Look 过的文章</div>
          </div>
          <article v-for="entry in readHistory" :key="entry.url + entry.ts" class="rss-article">
            <a :href="entry.url" target="_blank" class="rss-article-title">{{ entry.title }}</a>
            <div class="rss-article-meta">
              <span v-if="entry.feedName" class="rss-article-feed">{{ entry.feedName }}</span>
              <span class="rss-article-date">{{ relReadTime(entry.ts) }}</span>
            </div>
            <!-- 摘要直接展开 -->
            <div v-if="entry.summary" class="rss-summary-card">
              <div class="rss-summary-label">
                <span class="msi xs">auto_awesome</span>
                <span>AI 摘要</span>
              </div>
              <div class="rss-summary-body" v-html="renderMd(entry.summary)"></div>
            </div>
            <div class="rss-actions">
              <button class="rss-chip"
                :class="{ 'rss-chip-saved': isSaved(entry.url) }"
                @click="toggleSave(entry)">
                <span class="msi xs">{{ isSaved(entry.url) ? 'bookmark' : 'bookmark_border' }}</span>
                <span>{{ isSaved(entry.url) ? '已收藏' : '收藏' }}</span>
              </button>
              <button class="rss-chip" @click="removeFromRead(entry.url)">
                <span class="msi xs">history_toggle_off</span>
                <span>移除</span>
              </button>
            </div>
          </article>
        </div>

        <!-- Bookmarks list -->
        <div v-if="currentView === 'bookmarks'" class="flex-1 overflow-y-auto">
          <div v-if="!bookmarks.length" class="flex flex-col items-center justify-center text-text-3 gap-3 py-20">
            <span class="msi" style="font-size:40px;opacity:0.4">bookmark_border</span>
            <div class="text-sm">还没有收藏内容</div>
          </div>
          <article v-for="bm in bookmarks" :key="bm.id" class="rss-article">
            <a :href="bm.url" target="_blank" class="rss-article-title">{{ bm.title }}</a>
            <p v-if="bm.summary" class="rss-article-desc line-clamp-2">{{ bm.summary }}</p>
            <div class="rss-actions">
              <button class="rss-chip rss-chip-saved" @click="doRemoveBookmark(bm.id)">
                <span class="msi xs">bookmark_remove</span>
                <span>取消收藏</span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { marked } from 'marked';
import { LOCALE } from '@/system/locale.js';
import { useViewStore } from '@/stores/view.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

marked.setOptions({ breaks: true, gfm: true });
const renderMd = (t) => marked.parse(t || '');

const viewStore = useViewStore();

const currentView = ref('empty');
const feeds = ref([]);
const bookmarks = ref([]);
const activeFeed = ref(null);
const articles = ref([]);
const articlesLoading = ref(false);
const showAdd = ref(false);
const newUrl = ref('');
const newName = ref('');
const summarizingUrl = ref(null);
const summaries = reactive({});

// 已阅历史 (localStorage 持久化)
const READ_KEY = 'rssreader.read.v1';
const MAX_READ = 200;
const loadRead = () => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
};
const readHistory = ref(loadRead());
const saveRead = () => {
  try { localStorage.setItem(READ_KEY, JSON.stringify(readHistory.value)); } catch {}
};
const pushRead = (entry) => {
  // 同 url 去重 (保留最新一次)
  readHistory.value = [entry, ...readHistory.value.filter((e) => e.url !== entry.url)].slice(0, MAX_READ);
  saveRead();
};
const removeFromRead = (url) => {
  readHistory.value = readHistory.value.filter((e) => e.url !== url);
  saveRead();
};
const clearReadHistory = () => {
  if (!confirm('清空全部已阅历史?')) return;
  readHistory.value = [];
  saveRead();
};
const relReadTime = (ts) => {
  if (!ts) return '';
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const isMobile = () => window.innerWidth < 720;
const closeDrawerOnMobile = () => { if (isMobile()) viewStore.closeAppDrawer(); };

const isSaved = (url) => bookmarks.value.some((b) => b.url === url);

// 用 Google Favicon 服务拿订阅源头像; 加载失败前端回退到 msi 图标
const faviconUrl = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return ''; }
};
const onFaviconError = (e) => {
  // 隐藏失败的 <img>, 让兄弟元素 msi 回退图标显出来
  e.target.dataset.failed = '1';
};

const api = async (p, o) => (await fetch(`/apps/rssreader/${p}`, o)).json();
const loadFeeds = async () => { try { feeds.value = (await api('feeds')).feeds || []; } catch {} };
const loadBookmarks = async () => { try { bookmarks.value = (await api('bookmarks')).bookmarks || []; } catch {} };

const doAddFeed = async () => {
  if (!newUrl.value.trim()) return;
  await api('feed/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName.value.trim() || newUrl.value.trim(), url: newUrl.value.trim() })
  });
  newUrl.value = ''; newName.value = ''; showAdd.value = false;
  await loadFeeds();
};
const doRemoveFeed = async (id) => {
  await api('feed/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (activeFeed.value?.id === id) {
    activeFeed.value = null;
    currentView.value = 'empty';
  }
  await loadFeeds();
};

const openFeed = async (feed) => {
  activeFeed.value = feed;
  currentView.value = 'articles';
  articlesLoading.value = true;
  closeDrawerOnMobile();
  try { articles.value = (await api(`fetch?url=${encodeURIComponent(feed.url)}`)).items || []; }
  catch { articles.value = []; }
  articlesLoading.value = false;
};
const showBookmarks = () => {
  activeFeed.value = null;
  currentView.value = 'bookmarks';
  closeDrawerOnMobile();
};
const showRead = () => {
  activeFeed.value = null;
  currentView.value = 'read';
  closeDrawerOnMobile();
};

const doSummarize = async (item) => {
  summarizingUrl.value = item.url;
  let summary = '';
  try {
    summary = (await api('summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, description: item.description, url: item.url, locale: LOCALE })
    })).summary || '';
  } catch { summary = 'Failed'; }
  summaries[item.url] = summary;
  summarizingUrl.value = null;
  // 进「已阅」历史
  if (summary && summary !== 'Failed') {
    pushRead({
      url: item.url,
      title: item.title,
      summary,
      feedName: activeFeed.value?.name || '',
      ts: Date.now()
    });
  }
};
const doBookmark = async (item) => {
  await api('bookmark/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: item.title, url: item.url, summary: summaries[item.url] || '' })
  });
  await loadBookmarks();
};
const doRemoveBookmark = async (id) => {
  await api('bookmark/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  await loadBookmarks();
};
// 切换收藏状态
const toggleSave = async (item) => {
  const existing = bookmarks.value.find((b) => b.url === item.url);
  if (existing) await doRemoveBookmark(existing.id);
  else await doBookmark(item);
};

onMounted(() => {
  // 大屏幕进入时确保侧栏展开 (mobile 保持原状)
  if (!isMobile()) viewStore.openAppDrawer();
  loadFeeds();
  loadBookmarks();
});
</script>

<style scoped>
/* topbar */
.app-frame { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }
.topbar { flex: none; height: 64px; display: flex; align-items: center; padding: 8px 16px; background: var(--bg); }
.topbar .brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; }
.topbar .brand .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; color: var(--text); }
.topbar .right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .topbar .brand .name { font-size: 17px; }
}

/* ─── 侧栏 (Material 3 风) ─── */
.app-side-inner { display: flex; flex-direction: column; height: 100%; }

.rss-nav {
  display: flex; align-items: center; gap: 14px;
  width: 100%;
  padding: 0 14px 0 16px;
  height: 40px;
  border: 0; background: transparent;
  border-radius: 20px;
  color: var(--text);
  font-size: 14px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.rss-nav:hover { background: var(--bg-hover); }
.rss-nav.active { background: var(--accent-soft); color: var(--accent-fg); }
.rss-nav .msi { color: var(--text-2); }
.rss-nav.active .msi { color: var(--accent-fg); }
.rss-nav-label { flex: 1; text-align: left; }
.rss-nav-count {
  font-size: 11.5px;
  color: var(--text-3);
  background: var(--bg-elev);
  padding: 1px 8px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}
.rss-nav.active .rss-nav-count { background: rgba(255,255,255,0.5); color: var(--accent-fg); }

.rss-divider { height: 1px; background: var(--line-soft); margin: 6px 16px; }

.rss-section-label {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-2);
  padding: 8px 16px 6px;
}

.rss-feed-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 0 8px 0 16px;
  height: 36px;
  border: 0; background: transparent;
  border-radius: 18px;
  color: var(--text);
  font-size: 13.5px;
  cursor: pointer;
  transition: background .12s, color .12s;
  margin: 1px 0;
}
.rss-feed-item:hover { background: var(--bg-hover); }
.rss-feed-item.active { background: var(--accent-soft); color: var(--accent-fg); }
/* favicon 头像 - 加载失败时 img 隐藏, msi 兜底图标显出 */
.rss-feed-avatar {
  flex: none;
  position: relative;
  width: 20px; height: 20px;
  display: grid; place-items: center;
}
.rss-feed-avatar img {
  width: 20px; height: 20px;
  border-radius: 5px;
  object-fit: cover;
  background: #fff;
}
.rss-feed-avatar img[data-failed="1"] { display: none; }
.rss-feed-avatar img[data-failed="1"] + .rss-feed-fallback { display: block; }
.rss-feed-fallback {
  position: absolute; inset: 0;
  display: none;
  place-items: center;
  color: var(--text-3);
}
.rss-feed-item.active .rss-feed-fallback { color: var(--accent-fg); }
.rss-feed-name { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rss-feed-x {
  flex: none;
  width: 22px; height: 22px;
  display: grid; place-items: center;
  border-radius: 50%;
  color: var(--text-3);
  opacity: 0;
  transition: opacity .12s, background .12s, color .12s;
  cursor: pointer;
}
.rss-feed-item:hover .rss-feed-x,
.rss-feed-item.active .rss-feed-x { opacity: 1; }
.rss-feed-x:hover { background: rgba(60,64,67,0.12); color: var(--bad); }

/* 添加订阅源 */
.rss-add-section {
  flex: none;
  border-top: 1px solid var(--line-soft);
  padding: 8px;
}
.rss-add-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 0 16px;
  height: 40px;
  border: 0; background: transparent;
  border-radius: 20px;
  color: var(--text-2);
  font-size: 13.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.rss-add-btn:hover { background: var(--bg-hover); color: var(--text); }
.rss-add-btn .msi { color: var(--accent); }

.rss-add-form { display: flex; flex-direction: column; gap: 6px; padding: 4px 8px 8px; }
.rss-add-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  font-size: 12.5px;
  outline: 0;
  transition: border-color .15s, box-shadow .15s;
}
.rss-add-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.rss-add-cancel, .rss-add-confirm {
  flex: 1;
  height: 32px;
  border: 0;
  border-radius: 16px;
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.rss-add-cancel { background: var(--bg-elev); color: var(--text-2); }
.rss-add-cancel:hover { background: rgba(60,64,67,0.1); color: var(--text); }
.rss-add-confirm { background: var(--accent); color: #fff; }
.rss-add-confirm:hover { background: var(--accent-hi); }

/* ─── 主区 ─── */
.rss-pane-head {
  flex: none;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 24px;
  background: var(--bg);
  border-bottom: 1px solid var(--line-soft);
}
.rss-pane-icon { color: var(--accent); }
.rss-pane-title {
  flex: 1; min-width: 0;
  font-size: 16px; font-weight: 500; letter-spacing: -0.01em;
  color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rss-pane-count {
  flex: none;
  font-size: 11.5px; font-variant-numeric: tabular-nums;
  color: var(--text-3);
  background: var(--bg-elev);
  padding: 2px 10px;
  border-radius: 10px;
}
.rss-pane-clear {
  flex: none;
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border: 0; background: transparent;
  border-radius: 50%;
  color: var(--text-3);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.rss-pane-clear:hover { background: rgba(60,64,67,0.08); color: var(--bad); }
.rss-article-feed {
  font-size: 10.5px;
  color: var(--text-2);
  background: var(--bg-elev);
  padding: 2px 8px;
  border-radius: 8px;
}

/* 文章卡 */
.rss-article {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line-soft);
  transition: background .12s;
}
.rss-article:hover { background: var(--bg-hover); }
.rss-article-title {
  display: block;
  font-size: 14.5px; font-weight: 500; line-height: 1.5;
  color: var(--text);
  text-decoration: none;
  letter-spacing: -0.005em;
}
.rss-article-title:hover { color: var(--accent); }
.rss-article-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 6px 0 0;
  font-size: 12.5px; line-height: 1.6;
  color: var(--text-2);
}
.rss-article-meta {
  display: flex; align-items: center; gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

/* AI 摘要卡 */
.rss-summary-card {
  margin: 12px 0 4px;
  background: var(--accent-soft);
  border-radius: 14px;
  padding: 14px 16px;
}
.rss-summary-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--accent-fg);
  margin-bottom: 8px;
}
.rss-summary-body {
  font-size: 13px; line-height: 1.65;
  color: var(--text);
}
.rss-summary-body :deep(p) { margin: 0 0 0.5em; }
.rss-summary-body :deep(p:last-child) { margin-bottom: 0; }
.rss-summary-body :deep(ul), .rss-summary-body :deep(ol) { margin: 0.4em 0; padding-left: 1.4em; }
.rss-summary-body :deep(strong) { color: var(--accent-fg); }

/* 操作 chip 行 */
.rss-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  margin-top: 12px;
}
.rss-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 0;
  background: var(--bg-elev);
  border-radius: 16px;
  color: var(--text-2);
  font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s, transform .12s;
}
.rss-chip:hover:not(:disabled) {
  background: rgba(60,64,67,0.1);
  color: var(--text);
}
.rss-chip:disabled { opacity: 0.6; cursor: default; }
.rss-chip .msi { color: inherit; }
.rss-chip-primary {
  background: var(--accent-soft);
  color: var(--accent-fg);
}
.rss-chip-primary:hover:not(:disabled) {
  background: #d2e3fc;
  color: var(--accent-fg);
}
.rss-chip-saved {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent-fg);
}
.rss-chip-saved:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent-fg);
}
</style>
