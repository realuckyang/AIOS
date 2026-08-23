// App API 客户端；对话、持久化、调度和 UI 事件都由 app/server 提供。
import type { AppHealth, ConfigSchema, ChatMeta, Memory, RestartRequest, Row, SkillDetail, SkillSummary, StoreSkill, StoreSkillDetail, Todo, ToolDetail, ToolSummary, UsageByThread, UsageOverview, UsageTrend } from './types';

const base = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const listChats = () => request<ChatMeta[]>('GET', '/chats');
export const createChat = (data: { title?: string; description?: string; message?: { content: string; source: 'user' | 'runtime'; images?: string[] } }) =>
  request<ChatMeta>('POST', '/chats', data);
export const getChat = (id: string) => request<ChatMeta>('GET', `/chats/${id}`);
export const patchChat = (id: string, data: { title?: string; description?: string; context_start?: number; pinned?: boolean }) =>
  request<ChatMeta>('PATCH', `/chats/${id}`, data);
export const deleteChat = (id: string) => request<{ ok: boolean }>('DELETE', `/chats/${id}`);
export const stopChat = (id: string) => request<{ stopped: boolean }>('POST', `/chats/${id}/stop`);
export const listItems = (id: string, after = 0) => request<Row[]>('GET', `/chats/${id}/items${after ? `?after=${after}` : ''}`);
export const listItemsPage = (id: string, before?: number, limit = 50) =>
  request<{ items: Row[]; hasMore: boolean }>('GET', `/chats/${id}/items?limit=${limit}${before ? `&before=${before}` : ''}`);
export const sendMessage = (id: string, content: string, source: 'user' | 'runtime' = 'user', images?: string[]) =>
  request<{ seq: number }>('POST', `/chats/${id}/messages`, { content, source, ...(images?.length ? { images } : {}) });
export const uploadFile = (name: string, data: string) => request<{ path: string }>('POST', '/files', { name, data });
export const getConfig = () => request<ConfigSchema>('GET', '/config');
export const updateConfig = (changes: Record<string, string | number | null>) =>
  request<ConfigSchema & { restartRequired: boolean }>('PATCH', '/config', changes);
export const listSkills = () => request<SkillSummary[]>('GET', '/skills');
export const getSkill = (id: string) => request<SkillDetail>('GET', `/skills/${encodeURIComponent(id)}`);
export const listTools = () => request<ToolSummary[]>('GET', '/tools');
export const getTool = (name: string) => request<ToolDetail>('GET', `/tools/${encodeURIComponent(name)}`);
export const getHealth = () => request<AppHealth>('GET', '/health');
export const createRestart = (data: { summary: string; reason?: string; target_chat?: string }) => request<RestartRequest>('POST', '/system/restarts', data);
export const getPendingRestart = () => request<RestartRequest | null>('GET', '/system/restarts/pending');
export const confirmRestart = (id: string) => request<RestartRequest>('POST', `/system/restarts/${id}/confirm`);
export const cancelRestart = (id: string) => request<{ cancelled: boolean }>('DELETE', `/system/restarts/${id}`);
export const listTodos = () => request<Todo[]>('GET', '/todos');
export const createTodo = (title: string) => request<Todo>('POST', '/todos', { title });
export const patchTodo = (id: string, data: { title?: string; done?: boolean }) => request<Todo>('PATCH', `/todos/${id}`, data);
export const deleteTodo = (id: string) => request<{ ok: boolean }>('DELETE', `/todos/${id}`);
export const clearDoneTodos = () => request<{ cleared: number }>('DELETE', '/todos/done');
export const listMemories = (tag?: string) => request<Memory[]>('GET', `/memories${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`);
export const getMemory = (id: string) => request<Memory>('GET', `/memories/${id}`);
export const createMemory = (data: { title: string; body?: string; tags?: string[]; source?: 'manual' | 'agent' | 'runtime' }) =>
  request<Memory>('POST', '/memories', data);
export const patchMemory = (id: string, data: { title?: string; body?: string; tags?: string[]; pinned?: boolean }) =>
  request<Memory>('PATCH', `/memories/${id}`, data);
export const deleteMemory = (id: string) => request<{ ok: boolean }>('DELETE', `/memories/${id}`);
export const listMemoryTags = () => request<{ tag: string; count: number }[]>('GET', '/memories/tags');
export const getUsage = () => request<UsageOverview>('GET', '/usage');
export const getUsageTrend = (granularity: 'day' | 'hour' = 'day') => request<UsageTrend>('GET', `/usage/trend?granularity=${granularity}`);
export const getUsageThreads = () => request<UsageByThread>('GET', '/usage/threads');
// ---------- 技能商店 ----------
export const listStoreSkills = (cursor?: string) =>
  request<{ items: StoreSkill[]; nextCursor: string | null }>('GET', `/skills-store/list${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
export const getStoreSkill = (slug: string) =>
  request<StoreSkillDetail>('GET', `/skills-store/skill?slug=${encodeURIComponent(slug)}`);
export const listInstalled = () => request<{ slugs: string[] }>('GET', '/skills-store/installed');
export const installStoreSkill = (slug: string, force = false) =>
  request<{ ok: boolean; slug: string; files?: string[]; reason?: string }>('POST', '/skills-store/install', { slug, force });
export const uninstallStoreSkill = (slug: string) =>
  request<{ ok: boolean; slug: string; reason?: string }>('POST', '/skills-store/uninstall', { slug });
