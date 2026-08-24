<script setup>
import { computed, onActivated, onMounted, ref } from 'vue';
import * as api from '@/utils/api.js';
import AppsTrigger from '@/components/AppsTrigger.vue';
import ChatTrigger from '@/components/ChatTrigger.vue';
import { Camera, LoaderCircle, Trash2, X, ArrowDownAZ, Coins } from 'lucide-vue-next';

const fileInput = ref(null);
const loading = ref(false);
const errMsg = ref('');
const items = ref([]);
const totalWealth = ref(0);
const detailItem = ref(null);
const sortBy = ref('latest');
const sortOptions = [
  { key: 'latest', label: '最新', icon: ArrowDownAZ },
  { key: 'value',  label: '最贵', icon: Coins }
];

const sortedItems = computed(() => {
  const list = [...items.value];
  if (sortBy.value === 'value') list.sort((a, b) => Number(b.value) - Number(a.value));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return list;
});

const summaryText = computed(() => {
  const tags = {};
  items.value.forEach((i) => { tags[i.summary_tag] = (tags[i.summary_tag] || 0) + 1; });
  return Object.entries(tags).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' · ');
});

const daysSinceFirst = computed(() => {
  if (!items.value.length) return 0;
  const dates = items.value.map((i) => new Date(i.created_at)).filter((d) => !isNaN(d));
  if (!dates.length) return 0;
  const earliest = new Date(Math.min(...dates));
  return Math.max(1, Math.floor((Date.now() - earliest) / 86400000));
});

const toDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('读取图片失败'));
  reader.readAsDataURL(file);
});

const loadItems = async () => {
  try {
    const data = await api.get('/apps/treasure/list', { query: { page: 1, pageSize: 100 } });
    items.value = data.list || [];
    totalWealth.value = Number(data.totalWealth || 0);
    errMsg.value = '';
  } catch (e) { errMsg.value = '加载失败: ' + (e?.body?.message || e.message); }
};

const pickImage = () => fileInput.value?.click();

const onFileChange = async (e) => {
  const file = e.target?.files?.[0];
  if (!file) return;
  loading.value = true;
  errMsg.value = '';
  try {
    const dataUrl = await toDataUrl(file);
    const upload = await api.post('/apps/treasure/upload', { name: file.name, data: dataUrl });
    await api.post('/apps/treasure/appraise', { imagePath: upload.image.path });
    await loadItems();
  } catch (err) {
    errMsg.value = '鉴宝失败: ' + (err?.body?.message || err.message);
  } finally {
    loading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const remove = async (id) => {
  try {
    await api.post('/apps/treasure/delete', { id });
    await loadItems();
  } catch (err) {
    errMsg.value = '删除失败: ' + (err?.body?.message || err.message);
  }
};

const removeFromDetail = async () => {
  if (!detailItem.value) return;
  if (!confirm(`确认要把"${detailItem.value.name}"逐出宝阁?`)) return;
  await remove(detailItem.value.id);
  detailItem.value = null;
};

const openDetail = (item) => { detailItem.value = item; };
const imageUrl = (id) => `/apps/treasure/image?id=${id}`;
const formatValue = (v) => Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

onMounted(loadItems);
onActivated(loadItems);
</script>

<template>
  <div class="app-frame treasure">
    <!-- ── 顶栏 (AIOS 标准) ── -->
    <header class="topbar">
      <span class="left-spacer"></span>
      <div class="brand">
        <span class="seal">寳</span>
        <span class="name">藏宝阁</span>
      </div>
      <div class="right">
        <ChatTrigger />
        <AppsTrigger />
      </div>
    </header>

    <section class="page">
      <div class="scroll">
        <!-- ── 标题区 ── -->
        <header class="hero">
          <div class="hero-text">
            <h1>我的宝贝</h1>
            <p class="hero-sub">已陪伴你 {{ daysSinceFirst }} 天</p>
          </div>
          <button class="appraise-btn" @click="pickImage" :disabled="loading">
            <LoaderCircle v-if="loading" class="spin" :size="16" />
            <Camera v-else :size="16" />
            <span>{{ loading ? '鉴宝中…' : '鉴宝入库' }}</span>
          </button>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden-input" @change="onFileChange" />
        </header>

        <!-- ── 总财富 ── -->
        <div class="wealth">
          <div class="wealth-num">¥{{ formatValue(totalWealth) }}</div>
          <div class="wealth-meta">
            <span class="count-pill">{{ items.length }} 件藏品</span>
            <span class="tags" v-if="summaryText">{{ summaryText }}</span>
          </div>
        </div>

        <!-- ── 错误 ── -->
        <p v-if="errMsg" class="err">{{ errMsg }}</p>

        <!-- ── 列表头 ── -->
        <div class="list-head">
          <span class="list-label">全部藏品</span>
          <div class="sort-group">
            <button v-for="s in sortOptions" :key="s.key"
                    class="sort-btn"
                    :class="{ active: sortBy === s.key }"
                    @click="sortBy = s.key">
              <component :is="s.icon" :size="13" />
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <!-- ── 空状态 ── -->
        <div v-if="!items.length && !loading" class="empty">
          <div class="empty-icon">📦</div>
          <p>宝阁还空着<br>点击右上角「鉴宝入库」开始收集</p>
        </div>

        <!-- ── 藏品列表 ── -->
        <article v-for="item in sortedItems" :key="item.id" class="treasure-row" @click="openDetail(item)">
          <img :src="imageUrl(item.id)" class="thumb" :alt="item.name" />
          <div class="row-body">
            <div class="row-name">{{ item.name }}</div>
            <div class="row-meta">
              <span>{{ item.category }}</span>
              <span class="dot">·</span>
              <span>{{ item.condition_text }}</span>
              <span class="dot">·</span>
              <span class="row-tag">{{ item.summary_tag }}</span>
            </div>
            <div class="row-foot">
              <span class="row-value">¥{{ formatValue(item.value) }}</span>
              <span class="row-date">{{ formatDate(item.created_at) }} 入库</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ── 详情抽屉 ── -->
    <Transition name="mask">
      <div v-if="detailItem" class="drawer-mask" @click.self="detailItem = null"></div>
    </Transition>
    <Transition name="drawer">
      <aside v-if="detailItem" class="drawer">
        <div class="drawer-handle"></div>
        <img :src="imageUrl(detailItem.id)" class="drawer-img" :alt="detailItem.name" />
        <div class="drawer-body">
          <h2>{{ detailItem.name }}</h2>
          <div class="drawer-meta">
            {{ detailItem.category }} · {{ detailItem.condition_text }} · {{ detailItem.summary_tag }} · 入库于 {{ formatDate(detailItem.created_at) }}
          </div>
          <div class="drawer-value">¥{{ formatValue(detailItem.value) }}</div>
          <blockquote class="drawer-comment">
            {{ detailItem.comment || '暂无点评' }}
          </blockquote>
          <div class="drawer-actions">
            <button class="btn-ghost" @click="detailItem = null">
              <X :size="14" /><span>关闭</span>
            </button>
            <button class="btn-danger" @click="removeFromDetail">
              <Trash2 :size="14" /><span>逐出宝阁</span>
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.treasure { background: #f5f0e8; font-family: 'Songti SC', 'STSong', Georgia, 'PingFang SC', serif; color: #3a2e1e; }

/* topbar */
.topbar {
  flex: none; height: 64px;
  display: flex; align-items: center;
  padding: 8px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--line-soft);
}
.left-spacer { width: 8px; }
.brand { flex: 1; min-width: 0; margin: 0 4px 0 12px; display: flex; align-items: center; gap: 10px; }
.seal {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #b8853a, #8b6f47 60%, #5a3e28);
  color: #fff8e1;
  font-family: 'Songti SC', 'STSong', serif;
  font-weight: 700; font-size: 18px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(60,40,20,0.3), inset 0 1px 0 rgba(255,240,200,0.3);
  text-shadow: 0 1px 1px rgba(0,0,0,0.25);
}
.brand .name {
  font-size: 19px; font-weight: 600;
  font-family: 'Songti SC', 'STSong', serif;
  letter-spacing: 0.04em; color: #3a2e1e;
}
.right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

/* page */
.page { flex: 1; min-height: 0; overflow: hidden; }
.scroll { height: 100%; overflow-y: auto; max-width: 880px; margin: 0 auto; padding: 28px 24px 80px; }

/* hero */
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 6px; }
.hero-text h1 { margin: 0; font-size: 26px; font-weight: 700; color: #3a2e1e; letter-spacing: 0.02em; }
.hero-sub { margin: 6px 0 0; font-size: 11.5px; color: #9a8a70; letter-spacing: 0.06em; }
.appraise-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  background: linear-gradient(180deg, #6d4e34, #5a3e28);
  color: #e8d8b8;
  border: 0; border-radius: 999px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 6px rgba(90,62,40,0.28), inset 0 1px 0 rgba(255,240,200,0.18);
  transition: background .15s, transform .1s;
  cursor: pointer;
  flex: none;
}
.appraise-btn:hover:not(:disabled) { background: linear-gradient(180deg, #7a5840, #6d4e34); }
.appraise-btn:active { transform: scale(0.97); }
.appraise-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.hidden-input { display: none; }

/* wealth */
.wealth { margin: 18px 0 22px; padding-bottom: 22px; border-bottom: 1px solid #e4ddd0; }
.wealth-num {
  font-size: 38px; font-weight: 700; color: #5a3e28;
  letter-spacing: -0.02em;
  font-family: 'Songti SC', 'STSong', Georgia, serif;
}
.wealth-meta { margin-top: 8px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.count-pill {
  padding: 3px 11px;
  background: #5a3e28;
  color: #fff8e1;
  border-radius: 999px;
  font-size: 11px; letter-spacing: 0.06em;
}
.tags { font-size: 11.5px; color: #9a8a70; letter-spacing: 0.04em; }

.err {
  margin: 0 0 14px;
  padding: 10px 14px;
  background: #fdf0f0; color: #c06040;
  border: 1px solid rgba(192,96,64,0.2);
  border-radius: 8px;
  font-size: 13px;
}

/* list head */
.list-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.list-label { font-size: 11px; color: #9a8a70; letter-spacing: 0.18em; text-transform: uppercase; }
.sort-group { display: inline-flex; gap: 2px; }
.sort-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 11px;
  background: transparent; border: 0;
  color: #9a8a70;
  font-family: inherit; font-size: 11.5px;
  border-radius: 6px;
  cursor: pointer;
  transition: color .15s, background .15s;
}
.sort-btn:hover { color: #5a3e28; }
.sort-btn.active { background: #5a3e28; color: #e8d8b8; }

/* empty */
.empty { padding: 60px 20px; text-align: center; color: #9a8a70; }
.empty-icon { font-size: 42px; opacity: 0.55; margin-bottom: 12px; }
.empty p { margin: 0; font-size: 13px; line-height: 1.7; }

/* row */
.treasure-row {
  display: flex; gap: 14px; align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #ece6d8;
  cursor: pointer;
  transition: background .12s;
}
.treasure-row:last-child { border-bottom: 0; }
.treasure-row:hover { background: rgba(255,250,235,0.5); }
.thumb {
  flex: none;
  width: 84px; height: 84px;
  border-radius: 12px;
  object-fit: cover;
  background: #ece6d8;
  box-shadow: 0 2px 6px rgba(90,62,40,0.12), inset 0 0 0 1px rgba(184,133,58,0.15);
}
.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.row-name { font-size: 16px; font-weight: 700; color: #3a2e1e; }
.row-meta { font-size: 11.5px; color: #9a8a70; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.row-meta .dot { color: #c8b89c; }
.row-tag {
  display: inline-block;
  padding: 1px 8px;
  background: #ece6d8;
  border-radius: 999px;
  color: #7a6a50;
  font-size: 10.5px;
}
.row-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.row-value { font-size: 17px; font-weight: 700; color: #5a3e28; font-family: 'Songti SC', 'STSong', Georgia, serif; }
.row-date { font-size: 10.5px; color: #b8a890; letter-spacing: 0.04em; }

/* drawer */
.drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; }
.drawer {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  z-index: 101;
  width: 100%; max-width: 540px; max-height: 88vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 28px rgba(60,40,20,0.18);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.drawer-handle {
  width: 38px; height: 4px;
  background: #d8d0c0;
  border-radius: 999px;
  margin: 10px auto 0;
  flex: none;
}
.drawer-img {
  width: 100%; height: 280px;
  object-fit: cover;
  background: #ece6d8;
}
.drawer-body { padding: 18px 22px 22px; overflow-y: auto; }
.drawer-body h2 { margin: 0; font-size: 22px; font-weight: 700; color: #3a2e1e; }
.drawer-meta { margin-top: 5px; font-size: 12px; color: #9a8a70; line-height: 1.55; }
.drawer-value {
  margin-top: 14px;
  font-size: 30px; font-weight: 700; color: #5a3e28;
  font-family: 'Songti SC', 'STSong', Georgia, serif;
  letter-spacing: -0.01em;
}
.drawer-comment {
  margin: 14px 0 0;
  padding: 14px 16px;
  background: #f5f0e8;
  border-left: 3px solid #b8853a;
  border-radius: 4px;
  font-size: 13.5px; line-height: 1.75;
  color: #5a4a30;
  font-style: italic;
}
.drawer-comment::before { content: '"'; }
.drawer-comment::after { content: '"'; }
.drawer-actions { display: flex; gap: 10px; margin-top: 18px; }
.btn-ghost, .btn-danger {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px;
  border: 0; border-radius: 10px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-ghost { background: #f0ebe0; color: #7a6a50; }
.btn-ghost:hover { background: #e6e0d2; }
.btn-danger { background: #fdf0f0; color: #c06040; }
.btn-danger:hover { background: #fae0e0; }

/* transitions */
.mask-enter-active, .mask-leave-active { transition: opacity .22s; }
.mask-enter-from, .mask-leave-to { opacity: 0; }
.drawer-enter-active, .drawer-leave-active { transition: transform .28s cubic-bezier(.2,.9,.4,1); }
.drawer-enter-from, .drawer-leave-to { transform: translate(-50%, 100%); }

@media (max-width: 720px) {
  .topbar { padding: 8px; height: 56px; }
  .scroll { padding: 18px 16px 60px; }
  .hero { flex-direction: column; align-items: stretch; }
  .appraise-btn { align-self: flex-end; }
  .wealth-num { font-size: 32px; }
  .thumb { width: 72px; height: 72px; }
  .drawer-img { height: 220px; }
}
</style>
