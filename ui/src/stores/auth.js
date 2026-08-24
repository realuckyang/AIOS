// 鉴权状态 + 连接健康度.整体走 cookie session,不再做 HMAC 挑战应答.
//
// 浏览器 cookie 自动随同域请求发送 (HttpOnly + SameSite=Lax),
// AI / curl 用 Authorization: Bearer $AIOS_API_TOKEN.

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as api from '@/utils/api';

export const useAuthStore = defineStore('auth', () => {
    // 'pending' | 'ready' | 'offline'
    const state = ref('pending');
    const statusText = ref('连接中...');

    const configured = ref(false);
    const authenticated = ref(false);
    const authError = ref('');

    const showActions = computed(() => authenticated.value);

    async function refreshState() {
        try {
            const s = await api.get('/api/auth/state');
            configured.value = Boolean(s.configured);
            authenticated.value = Boolean(s.authenticated);
            state.value = 'ready';
            statusText.value = authenticated.value ? '已连接' : '需要认证';
            return s;
        } catch (err) {
            state.value = 'offline';
            statusText.value = '连接失败';
            throw err;
        }
    }

    async function init() {
        state.value = 'pending';
        statusText.value = '连接中...';
        try {
            await refreshState();
        } catch {
            // 网络问题,3 秒后重试
            setTimeout(init, 3000);
        }
    }

    async function setupPassword(password, language = 'zh') {
        authError.value = '';
        try {
            await api.post('/api/auth/setup', { password, language });
            await refreshState();
            return true;
        } catch (err) {
            authError.value = err?.body?.message || err.message || '设置失败';
            return false;
        }
    }

    async function login(password) {
        authError.value = '';
        try {
            await api.post('/api/auth/login', { password });
            await refreshState();
            return true;
        } catch (err) {
            authError.value = err?.body?.message || err.message || '登录失败';
            return false;
        }
    }

    async function logout() {
        try { await api.post('/api/auth/logout'); } catch {}
        authenticated.value = false;
        state.value = 'ready';
        statusText.value = '需要认证';
    }

    async function changePassword(oldPassword, newPassword) {
        authError.value = '';
        try {
            await api.post('/api/auth/change-password', { oldPassword, newPassword });
            return true;
        } catch (err) {
            authError.value = err?.body?.message || err.message || '修改失败';
            return false;
        }
    }

    return {
        state, statusText,
        configured, authenticated, authError,
        showActions,
        init, refreshState,
        setupPassword, login, logout, changePassword,
    };
});
