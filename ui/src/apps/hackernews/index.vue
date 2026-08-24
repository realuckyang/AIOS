<script setup>
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { marked } from 'marked';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';

marked.setOptions({ breaks: true, gfm: true });
const renderMd = (t) => marked.parse(t || '');

// ── state ─────────────────────────────────────
const view = ref('list');             // list | bookmarks | detail
const activeTab = ref('top');
const tabs = [
  { id: 'top',  label: '热门' },
  { id: 'new',  label: '最新' },
  { id: 'best', label: '精选' }
];

const stories = ref([]);
const loading = ref(false);
const bookmarks = ref([]);

const story = ref(null);
const comments = ref([]);
const detailLoading = ref(false);

const summarizing = ref(false);
const summaryText = ref('');
const digesting = ref(false);
const digestText = ref('');

const errMsg = ref('');

// ── helpers ──────────────────────────────────
const isBookmarked = (id) => bookmarks.value.some((b) => b.hn_id === id);
const getDomain = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return ''; } };

// ── data load ────────────────────────────────
async function loadStories(type = 'top') {
  loading.value = true;
  try {
    const r = await api.get('/apps/hackernews/list', { query: { type } });
    stories.value = r?.stories || [];
    errMsg.value = '';
  } catch (e) { errMsg.value = '获取列表失败: ' + (e?.body?.message || e.message || e); }
  loading.value = false;
}
async function loadBookmarks() {
  try {
    const r = await api.get('/apps/hackernews/bookmarks');
    bookmarks.value = r?.bookmarks || [];
  } catch { bookmarks.value = []; }
}

function switchTab(t) {
  activeTab.value = t;
  view.value = 'list';
  digestText.value = '';
  loadStories(t);
}

async function openDetail(id) {
  view.value = 'detail';
  detailLoading.value = true;
  summaryText.value = '';
  story.value = null;
  comments.value = [];
  try {
    const d = await api.get('/apps/hackernews/detail', { query: { id } });
    story.value = d.story;
    comments.value = d.comments || [];
  } catch (e) { errMsg.value = '获取详情失败: ' + (e?.body?.message || e.message); }
  detailLoading.value = false;
}

async function toggleBookmark(item) {
  const hnId = item.hn_id || item.id;
  try {
    if (isBookmarked(hnId)) {
      await api.post('/apps/hackernews/unbookmark', { hnId });
    } else {
      await api.post('/apps/hackernews/bookmark', {
        hnId,
        title: item.title,
        url: item.url,
        by: item.by,
        score: item.score
      });
    }
    await loadBookmarks();
  } catch (e) { errMsg.value = '收藏操作失败: ' + (e?.body?.message || e.message); }
}

async function doSummarize() {
  if (!story.value) return;
  summarizing.value = true;
  try {
    const r = await api.post('/apps/hackernews/summarize', {
      title: story.value.title,
      url: story.value.url,
      text: story.value.text,
      locale: 'zh'
    });
    summaryText.value = r?.summary || '';
  } catch (e) { summaryText.value = '生成失败: ' + (e?.body?.message || e.message); }
  summarizing.value = false;
}

async function doDigest() {
  digesting.value = true;
  try {
    const list = stories.value.slice(0, 20)
      .map((s, i) => `${i + 1}. ${s.title} (${s.score} pts, ${s.descendants} comments)`)
      .join('\n');
    const r = await api.post('/apps/hackernews/summarize', {
      title: 'Hacker News Digest',
      text: list,
      locale: 'zh'
    });
    digestText.value = r?.summary || '';
  } catch (e) { digestText.value = '生成失败: ' + (e?.body?.message || e.message); }
  digesting.value = false;
}

function backToList() {
  view.value = 'list';
  story.value = null;
  comments.value = [];
}

const showOrangeBar = computed(() => view.value !== 'detail');

onMounted(() => { loadStories('top'); loadBookmarks(); });
onActivated(() => { if (!stories.value.length) loadStories(activeTab.value); loadBookmarks(); });
</script>

<template>
  <div class="app-frame hn">
    <!-- ── 顶栏 ── -->
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand">
        <span class="hn-logo">Y</span>
        <span class="name">Hacker News</span>
      </div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <!-- ── HN 橘黄子栏(列表/收藏视图) ── -->
    <nav v-if="showOrangeBar" class="hn-bar">
      <div class="hn-bar-inner">
        <div class="hn-tabs">
          <button v-for="tab in tabs" :key="tab.id"
                  :class="['hn-tab', { active: activeTab === tab.id && view === 'list' }]"
                  @click="switchTab(tab.id)">{{ tab.label }}</button>
          <span class="hn-sep">|</span>
          <button :class="['hn-tab', { active: view === 'bookmarks' }]"
                  @click="view = view === 'bookmarks' ? 'list' : 'bookmarks'">
            ★ 收藏 <span class="bookmark-count" v-if="bookmarks.length">({{ bookmarks.length }})</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- ── 内容区 ── -->
    <section class="page">
      <div v-if="errMsg" class="err-bar">{{ errMsg }}</div>

      <!-- ─── List ─── -->
      <div v-if="view === 'list'" class="content">
        <div v-if="loading" class="placeholder">加载中…</div>
        <template v-else>
          <!-- Digest banner -->
          <div class="digest-area">
            <div v-if="!digestText" class="digest-banner">
              <div class="digest-text">
                <div class="digest-title">✦ 今日 HN 头条速读</div>
                <div class="digest-desc">让 AI 帮你总结当前榜单的核心动态</div>
              </div>
              <button class="digest-btn" :disabled="digesting" @click="doDigest">
                <span v-if="digesting" class="spin">↻</span>
                <span v-else>✦</span>
                {{ digesting ? '生成中…' : '生成摘要' }}
              </button>
            </div>
            <article v-else class="digest-card">
              <header>
                <span class="digest-card-title">✦ 今日速读</span>
                <button class="ghost" @click="digestText = ''">✕</button>
              </header>
              <div class="md-body" v-html="renderMd(digestText)"></div>
            </article>
          </div>

          <!-- Story rows -->
          <div class="stories">
            <article v-for="(s, i) in stories" :key="s.id" class="story-row" @click="openDetail(s.id)">
              <span class="rank">{{ i + 1 }}</span>
              <div class="story-body">
                <div class="story-title">{{ s.title }}</div>
                <div class="story-meta">
                  <span>▲ {{ s.score }}</span>
                  <span>{{ s.by }}</span>
                  <span>{{ s.descendants }} 评论</span>
                  <span v-if="s.url" class="story-domain">{{ getDomain(s.url) }}</span>
                </div>
              </div>
              <button class="bookmark-btn"
                      :class="{ active: isBookmarked(s.id) }"
                      @click.stop="toggleBookmark(s)"
                      :title="isBookmarked(s.id) ? '取消收藏' : '收藏'">
                {{ isBookmarked(s.id) ? '★' : '☆' }}
              </button>
            </article>
            <div v-if="!stories.length && !loading" class="placeholder">这一榜暂时是空的。</div>
          </div>
        </template>
      </div>

      <!-- ─── Bookmarks ─── -->
      <div v-else-if="view === 'bookmarks'" class="content">
        <div v-if="!bookmarks.length" class="placeholder">还没有收藏。在列表里点 ☆ 收藏一篇试试。</div>
        <div v-else class="stories">
          <article v-for="bm in bookmarks" :key="bm.id" class="story-row" @click="openDetail(bm.hn_id)">
            <span class="rank star">★</span>
            <div class="story-body">
              <div class="story-title">{{ bm.title }}</div>
              <div class="story-meta">
                <span>▲ {{ bm.score }}</span>
                <span>{{ bm.by }}</span>
                <span v-if="bm.url" class="story-domain">{{ getDomain(bm.url) }}</span>
              </div>
            </div>
            <button class="bookmark-btn active" @click.stop="toggleBookmark(bm)" title="取消收藏">★</button>
          </article>
        </div>
      </div>

      <!-- ─── Detail ─── -->
      <div v-else-if="view === 'detail'" class="content detail">
        <button class="back-btn" @click="backToList">← 返回列表</button>
        <div v-if="detailLoading" class="placeholder">加载中…</div>
        <template v-else-if="story">
          <header class="detail-head">
            <h1>{{ story.title }}</h1>
            <div class="detail-meta">
              <span>▲ {{ story.score }} 分</span>
              <span>{{ story.by }}</span>
              <span>{{ story.descendants }} 评论</span>
              <a v-if="story.url" :href="story.url" target="_blank" class="detail-link">{{ getDomain(story.url) }} ↗</a>
            </div>
          </header>

          <p v-if="story.text" class="story-text" v-html="story.text"></p>

          <!-- AI summary -->
          <section class="summary-area">
            <button class="summary-btn" :class="{ done: summaryText }" :disabled="summarizing" @click="doSummarize">
              <span v-if="summarizing" class="spin">↻</span>
              <span v-else>✦</span>
              {{ summarizing ? '生成中…' : (summaryText ? '✓ 已生成摘要' : '生成 AI 摘要') }}
            </button>
            <article v-if="summaryText" class="summary-card md-body" v-html="renderMd(summaryText)"></article>
          </section>

          <!-- Comments -->
          <section v-if="comments.length" class="comments">
            <div class="section-label">读者评论</div>
            <div v-for="c in comments" :key="c.id" class="comment">
              <div class="comment-author">{{ c.by }}</div>
              <div class="comment-body" v-html="c.text"></div>
              <div v-for="child in c.children" :key="child.id" class="reply">
                <div class="comment-author muted">{{ child.by }}</div>
                <div class="comment-body" v-html="child.text"></div>
              </div>
            </div>
          </section>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hn { background: #f6f5ef; }

/* topbar (AIOS 标准) */
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--line-soft);
}
.left-spacer { width: 8px; }
.brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; display: flex; align-items: center; gap: 10px; }
.hn-logo {
  width: 26px; height: 26px;
  display: grid; place-items: center;
  background: #f60; color: #fff;
  font-family: Georgia, 'PingFang SC', serif;
  font-weight: 800; font-size: 17px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.18);
}
.brand .name { font-size: 18px; font-weight: 600; letter-spacing: -0.005em; font-family: Georgia, 'PingFang SC', serif; }
.right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

/* HN orange sub-bar */
.hn-bar { background: #f60; border-bottom: 2px solid #c45500; flex: none; }
.hn-bar-inner { max-width: 760px; margin: 0 auto; padding: 8px 20px; }
.hn-tabs { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.hn-tab {
  padding: 4px 10px;
  background: transparent; border: 0;
  color: rgba(255,255,255,0.62);
  font-size: 12px; font-weight: 500;
  font-family: -apple-system, 'PingFang SC', system-ui, sans-serif;
  border-radius: 4px;
  transition: background .15s, color .15s;
  cursor: pointer;
}
.hn-tab:hover { color: #fff; }
.hn-tab.active { background: rgba(255,255,255,0.22); color: #fff; }
.hn-sep { color: rgba(255,255,255,0.3); margin: 0 6px; user-select: none; }
.bookmark-count { font-family: ui-monospace, monospace; font-size: 11px; opacity: 0.85; }

/* page */
.page { flex: 1; min-height: 0; overflow-y: auto; }
.content { max-width: 720px; margin: 0 auto; padding: 16px 20px 60px; font-family: Georgia, 'PingFang SC', serif; color: #2c2c2c; }
.placeholder { text-align: center; padding: 60px 20px; color: #999; font-family: -apple-system, 'PingFang SC', sans-serif; font-size: 13px; }
.err-bar {
  max-width: 720px; margin: 12px auto 0;
  padding: 10px 14px;
  background: #fce8e6; color: #c45500;
  border-radius: 8px; font-size: 13px;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}

/* digest area */
.digest-area { margin-bottom: 8px; padding-bottom: 14px; border-bottom: 1px solid #e8e5d8; }
.digest-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #fff8e1;
  border: 1px solid rgba(245,127,23,0.3);
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.digest-text { flex: 1; min-width: 0; font-family: -apple-system, 'PingFang SC', sans-serif; }
.digest-title { font-size: 14px; font-weight: 700; color: #c45500; margin-bottom: 3px; }
.digest-desc { font-size: 12px; color: rgba(196,85,0,0.78); }
.digest-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px;
  background: #f60; color: #fff;
  border: 0; border-radius: 9px;
  font-size: 12.5px; font-weight: 700;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  box-shadow: 0 1px 2px rgba(0,0,0,0.12);
  transition: background .15s, transform .1s;
  cursor: pointer;
  flex: none;
}
.digest-btn:hover:not(:disabled) { background: #e65c00; }
.digest-btn:active { transform: scale(0.96); }
.digest-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.digest-card {
  background: #fff;
  border: 1px solid #e0ddd0;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.digest-card header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; padding-bottom: 10px;
  border-bottom: 1px solid #f0ede4;
}
.digest-card-title {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #c45500;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
.ghost {
  background: transparent; border: 0; cursor: pointer;
  color: #999; font-size: 14px;
  padding: 2px 6px; border-radius: 4px;
}
.ghost:hover { color: #333; background: #f6f5ef; }

/* stories */
.stories { display: flex; flex-direction: column; }
.story-row {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 8px;
  border-bottom: 1px solid #e8e5d8;
  cursor: pointer;
  transition: background .12s;
}
.story-row:hover { background: #eeebdf; }
.story-row:hover .story-title { color: #c45500; }
.rank {
  flex: none; width: 28px; text-align: right;
  color: #c4c0b0; font-size: 13px; font-weight: 500;
  font-family: -apple-system, sans-serif;
  padding-top: 2px;
  font-variant-numeric: tabular-nums;
}
.rank.star { color: #f60; font-size: 16px; }
.story-body { flex: 1; min-width: 0; }
.story-title {
  font-size: 15px; line-height: 1.4;
  margin-bottom: 5px;
  transition: color .15s;
}
.story-meta {
  display: flex; gap: 12px; flex-wrap: wrap;
  font-size: 11px; color: #999;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
.story-domain { color: #c4c0b0; }
.bookmark-btn {
  flex: none;
  background: transparent; border: 0;
  font-size: 18px; color: #ddd;
  padding: 2px 6px; border-radius: 4px;
  cursor: pointer; opacity: 0;
  transition: opacity .15s, color .15s, transform .1s;
}
.story-row:hover .bookmark-btn { opacity: 1; }
.bookmark-btn:hover { color: #f60; }
.bookmark-btn.active { color: #f60; opacity: 1; }
.bookmark-btn:active { transform: scale(1.15); }

/* detail */
.detail { padding-top: 14px; }
.back-btn {
  background: transparent; border: 0;
  color: #c45500; font-size: 13px; font-weight: 500;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  padding: 4px 10px 4px 0;
  cursor: pointer;
  margin-bottom: 14px;
}
.back-btn:hover { text-decoration: underline; }
.detail-head { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #e8e5d8; }
.detail-head h1 {
  margin: 0 0 8px;
  font-size: 22px; font-weight: 700;
  line-height: 1.3; letter-spacing: -0.005em;
}
.detail-meta {
  display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
  font-size: 12px; color: #999;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
.detail-link { margin-left: auto; color: #c45500; }
.detail-link:hover { text-decoration: underline; }
.story-text {
  font-size: 14px; line-height: 1.75;
  color: #444;
  background: #fff;
  border: 1px solid #e8e5d8;
  border-radius: 10px;
  padding: 14px 18px;
  margin: 0 0 20px;
}

/* summary */
.summary-area { margin: 18px 0 28px; }
.summary-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px;
  background: #fff8e1; color: #f57f17;
  border: 1px solid rgba(245,127,23,0.25); border-radius: 9px;
  font-size: 12.5px; font-weight: 600;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  cursor: pointer;
  transition: all .15s;
}
.summary-btn:hover:not(:disabled) { background: #fff3c4; }
.summary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.summary-btn.done { background: #e8f5e9; color: #2e7d32; border-color: rgba(46,125,50,0.25); }
.summary-card {
  margin-top: 14px;
  background: #fff;
  border: 1px solid #e0ddd0;
  border-radius: 10px;
  padding: 16px 20px;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  font-size: 14px; line-height: 1.7;
  color: #444;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* comments */
.comments { margin-top: 20px; }
.section-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #999;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  margin-bottom: 14px;
}
.comment { padding: 0 0 16px; margin-bottom: 16px; border-bottom: 1px solid #f0ede4; }
.comment:last-child { border-bottom: 0; }
.comment-author {
  font-size: 11.5px; font-weight: 600;
  color: #c45500;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  margin-bottom: 6px;
}
.comment-author.muted { color: #999; font-weight: 500; }
.comment-body {
  font-size: 13.5px; line-height: 1.65;
  color: #444;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
.comment-body :deep(p) { margin: 0 0 8px; }
.comment-body :deep(p:last-child) { margin-bottom: 0; }
.comment-body :deep(a) { color: #c45500; }
.reply { margin: 12px 0 0 16px; padding-left: 14px; border-left: 2px solid #e8e5d8; }
.reply .comment-body { font-size: 13px; color: #666; }

/* markdown body */
.md-body :deep(p) { margin: 0 0 10px; line-height: 1.7; }
.md-body :deep(p:last-child) { margin-bottom: 0; }
.md-body :deep(ul), .md-body :deep(ol) { margin: 0 0 10px; padding-left: 22px; }
.md-body :deep(li) { margin-bottom: 4px; line-height: 1.65; }
.md-body :deep(strong) { color: #2c2c2c; }
.md-body :deep(code) {
  background: #f6f5ef; padding: 1px 5px; border-radius: 3px;
  font-family: ui-monospace, Menlo, monospace; font-size: 12px;
}
.md-body :deep(a) { color: #c45500; text-decoration: underline; }

/* responsive */
@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .brand .name { font-size: 16px; }
  .content { padding: 14px 14px 40px; }
  .digest-banner { flex-direction: column; align-items: stretch; }
  .digest-btn { width: 100%; justify-content: center; }
  .detail-head h1 { font-size: 19px; }
}
</style>
