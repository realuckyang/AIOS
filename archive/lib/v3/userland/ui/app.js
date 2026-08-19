// 默认对话浏览器:扁平列表 + 对话视图。buildless,改完刷新即生效。
import * as api from '/api.js';

const $ = (id) => document.getElementById(id);
const state = {
  chats: [],
  currentId: null, // null = 草稿态
  items: [],
  meta: null,
  streams: { message: '', reasoning: '' },
};

// ---------- 渲染 ----------

function renderChatList() {
  const ul = $('chat-list');
  ul.innerHTML = '';
  for (const chat of state.chats) {
    const li = document.createElement('li');
    li.className = chat.id === state.currentId ? 'active' : '';
    li.innerHTML = `<span class="t"></span><span class="s ${chat.status}"></span>`;
    li.querySelector('.t').textContent = chat.title || chat.id;
    li.onclick = () => openChat(chat.id);
    ul.appendChild(li);
  }
}

function itemText(item) {
  if (typeof item?.content === 'string') return item.content;
  return (item?.content ?? []).map((c) => c.text ?? '').join('');
}


// ---------- Markdown ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    try {
      return DOMPurify.sanitize(marked.parse(text));
    } catch { /* 解析失败则回退纯文本 */ }
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function bubble(className, text, label, md = false) {
  const div = document.createElement('div');
  div.className = `bubble ${className}${md ? ' md' : ''}`;
  if (label) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'body';
    if (md) body.innerHTML = renderMarkdown(text);
    else body.textContent = text;
    details.append(summary, body);
    div.appendChild(details);
  } else if (md) {
    div.innerHTML = renderMarkdown(text);
  } else {
    div.textContent = text;
  }
  return div;
}

function rowNode(row) {
  const { source, item } = row;
  if (item.type === 'message') {
    const text = itemText(item);
    if (source === 'user') return bubble('user', text, null, true);
    if (source === 'runtime') return bubble('runtime', text, 'runtime 消息', true);
    return bubble('model', text, null, true);
  }
  if (item.type === 'reasoning') {
    // content[].text 是原始推理文本(如 DeepSeek);summary[].text 是部分供应商额外给的摘要。
    // 两者都可能是空数组而非 null,不能用 ?? 挑一个——要看哪个真的有内容。
    const fromContent = (item.content ?? []).map((c) => c.text ?? '').join('');
    const fromSummary = (item.summary ?? []).map((c) => c.text ?? '').join('');
    const text = fromContent || fromSummary || '(思考内容不可见,供应商未返回)';
    return bubble('reasoning', text, '思考');
  }
  if (item.type === 'function_call') {
    let command = '';
    try { command = JSON.parse(item.arguments || '{}').command || ''; } catch { /* 忽略 */ }
    return bubble('tool', command, 'bash');
  }
  if (item.type === 'function_call_output') {
    let out = {};
    try { out = JSON.parse(item.output || '{}'); } catch { /* 忽略 */ }
    const text = [`exit ${out.exit_code}`, out.stdout, out.stderr].filter(Boolean).join('\n');
    return bubble('tool', text, `结果 · exit ${out.exit_code}`);
  }
  return bubble('model', JSON.stringify(item), item.type);
}

function renderThread() {
  const thread = $('thread');
  thread.innerHTML = '';
  const start = state.meta?.context_start || 0;
  for (const row of state.items) {
    const node = rowNode(row);
    if (row.seq <= start) node.classList.add('forgotten');
    thread.appendChild(node);
  }
  for (const kind of ['reasoning', 'message']) {
    if (state.streams[kind]) {
      const node = bubble(kind === 'message' ? 'model' : 'reasoning', state.streams[kind], kind === 'reasoning' ? '思考中…' : null);
      node.classList.add('streaming');
      if (node.querySelector('details')) node.querySelector('details').open = true;
      thread.appendChild(node);
    }
  }
  thread.scrollTop = thread.scrollHeight;
}

function renderHeader() {
  const chat = state.chats.find((c) => c.id === state.currentId);
  $('chat-title').textContent = chat ? (chat.title || chat.id) : '新对话';
  $('stop-chat').hidden = chat?.status !== 'running';
  $('delete-chat').hidden = !chat;
}

function renderAll() { renderChatList(); renderHeader(); renderThread(); }

// ---------- 动作 ----------

async function refreshChats() {
  state.chats = await api.listChats();
  renderChatList();
  renderHeader();
}

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

function toggleSidebar() {
  if (isMobile()) document.body.classList.toggle('sidebar-open');
  else document.body.classList.toggle('sidebar-collapsed');
}
function closeSidebar() { document.body.classList.remove('sidebar-open'); }

async function openChat(id) {
  state.currentId = id;
  if (isMobile()) closeSidebar();
  state.streams = { message: '', reasoning: '' };
  state.meta = await api.getChat(id);
  state.items = await api.listItems(id);
  renderAll();
}

function draft() {
  state.currentId = null;
  state.meta = null;
  state.items = [];
  state.streams = { message: '', reasoning: '' };
  renderAll();
  $('input').focus();
}

async function send() {
  const input = $('input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (!state.currentId) {
    const chat = await api.createChat({ title: text.slice(0, 24), message: { content: text, source: 'user' } });
    await refreshChats();
    await openChat(chat.id);
  } else {
    await api.sendMessage(state.currentId, text);
  }
}

// ---------- 事件 ----------

const touching = (data) => data.chatId === state.currentId;

api.subscribe({
  status: async () => refreshChats(),
  input: (data) => { if (touching(data)) { state.items.push(data.row); renderThread(); } },
  message: (data) => {
    if (!touching(data)) return;
    if (data.delta) { state.streams.message += data.delta; renderThread(); }
    if (data.row) { state.streams.message = ''; state.items.push(data.row); renderThread(); }
  },
  reasoning: (data) => {
    if (!touching(data)) return;
    if (data.delta) { state.streams.reasoning += data.delta; renderThread(); }
    if (data.row) { state.streams.reasoning = ''; state.items.push(data.row); renderThread(); }
  },
  tool_calls: (data) => { if (touching(data)) { state.streams.message = ''; state.items.push(data.row); renderThread(); } },
  tool_results: (data) => { if (touching(data)) { state.items.push(data.row); renderThread(); } },
  done: (data) => { if (touching(data)) { state.streams = { message: '', reasoning: '' }; openChat(data.chatId); } },
  error: (data) => {
    if (!touching(data)) return;
    const node = document.createElement('div');
    node.className = 'error-banner';
    node.textContent = data.message;
    $('thread').appendChild(node);
  },
  gap: () => { refreshChats(); if (state.currentId) openChat(state.currentId); },
});

$('menu-btn').onclick = toggleSidebar;
$('overlay').onclick = closeSidebar;
window.addEventListener('resize', () => {
  // 跨断点时清掉另一套状态的残留 class,避免 PC/移动端规则打架
  if (isMobile()) document.body.classList.remove('sidebar-collapsed');
  else document.body.classList.remove('sidebar-open');
});
$('new-chat').onclick = draft;
$('stop-chat').onclick = () => state.currentId && api.stopChat(state.currentId);
$('delete-chat').onclick = async () => {
  if (!state.currentId || !confirm('删除这条对话?')) return;
  await api.deleteChat(state.currentId);
  await refreshChats();
  draft();
};
$('send').onclick = send;
// 拼音/日文等 IME 组合中输入法会触发 keydown Enter(确认候选词),必须跳过。
// 用 compositionstart/end 维护标志位 + isComposing 双保险(兼容 Safari/旧内核)。
let composing = false;
$('input').addEventListener('compositionstart', () => { composing = true; });
$('input').addEventListener('compositionend', () => { composing = false; });
$('input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing) {
    event.preventDefault();
    send();
  }
});

refreshChats().then(() => {
  if (state.chats[0]) openChat(state.chats[0].id);
});
