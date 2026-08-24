<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Sprout, Eye, EyeOff, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import * as api from '@/utils/api';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const applyingLanguage = ref(false);
const showPassword = ref(false);
const inputRef = ref(null);
const savedLanguage = localStorage.getItem('aios.setup.language');
const browserLanguage = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'zh';
const language = ref(savedLanguage || browserLanguage);

const COPY = {
    zh: {
        brand: 'AIOS',
        welcome: '欢迎使用 AIOS',
        login: '请输入密码',
        setupSubhead: '首次使用,请为 AIOS 设置一个密码',
        passwordPlaceholder: '密码 (至少 8 位)',
        confirmPlaceholder: '再次输入密码',
        setupLoading: '设置中…',
        loginLoading: '登录中…',
        setupSubmit: '设置密码',
        loginSubmit: '登录',
        passwordShort: '密码至少 8 位',
        mismatch: '两次输入的密码不一致',
        show: '显示',
        hide: '隐藏',
        languageLabel: '语言',
        zh: '中文',
        en: 'English',
        applying: '正在应用语言,系统即将重启…',
        forgot: '忘记密码?在终端运行:',
    },
    en: {
        brand: 'AIOS',
        welcome: 'Welcome to AIOS',
        login: 'Enter Password',
        setupSubhead: 'First use: set a password for AIOS',
        passwordPlaceholder: 'Password (at least 8 characters)',
        confirmPlaceholder: 'Enter password again',
        setupLoading: 'Setting up…',
        loginLoading: 'Signing in…',
        setupSubmit: 'Set Password',
        loginSubmit: 'Sign In',
        passwordShort: 'Password must be at least 8 characters',
        mismatch: 'Passwords do not match',
        show: 'Show',
        hide: 'Hide',
        languageLabel: 'Language',
        zh: '中文',
        en: 'English',
        applying: 'Applying language. AIOS will restart…',
        forgot: 'Forgot password? Run this in terminal:',
    }
};

const isSetup = computed(() => !auth.configured);
const expectedRoute = computed(() => isSetup.value ? 'welcome' : 'login');
const t = computed(() => COPY[language.value] || COPY.zh);

const heading = computed(() => isSetup.value ? t.value.welcome : t.value.login);
const subhead = computed(() => isSetup.value
    ? t.value.setupSubhead
    : '');
const submitLabel = computed(() => {
    if (loading.value) return isSetup.value ? t.value.setupLoading : t.value.loginLoading;
    return isSetup.value ? t.value.setupSubmit : t.value.loginSubmit;
});

const localError = ref('');
const error = computed(() => localError.value || auth.authError || '');

const canSubmit = computed(() => {
    if (loading.value) return false;
    if (password.value.length < 8) return false;
    if (isSetup.value && password.value !== passwordConfirm.value) return false;
    return true;
});

async function submit() {
    localError.value = '';
    if (password.value.length < 8) {
        localError.value = t.value.passwordShort;
        return;
    }
    if (isSetup.value && password.value !== passwordConfirm.value) {
        localError.value = t.value.mismatch;
        return;
    }
    loading.value = true;
    try {
        const ok = isSetup.value
            ? await auth.setupPassword(password.value, language.value)
            : await auth.login(password.value);
        if (ok) {
            password.value = '';
            passwordConfirm.value = '';
            localStorage.setItem('aios.setup.language', language.value);
            if (isSetup.value && language.value !== 'zh') {
                applyingLanguage.value = true;
                await api.post('/api/runtime/language/apply', { language: language.value });
                setTimeout(() => { location.replace('/'); }, 5000);
                return;
            }
            router.replace('/');
        }
    } finally {
        if (!applyingLanguage.value) loading.value = false;
    }
}

onMounted(async () => {
    await auth.refreshState().catch(() => {});
    if (auth.authenticated) {
        router.replace('/');
        return;
    }
    if (route.name !== expectedRoute.value) {
        router.replace({ name: expectedRoute.value });
        return;
    }
    await nextTick();
    inputRef.value?.focus();
});
</script>

<template>
    <div class="flex min-h-dvh w-screen items-center justify-center bg-bg px-6 py-10">
        <div class="w-full max-w-[360px]">
            <!-- 品牌 -->
            <div class="mb-8 flex flex-col items-center gap-2">
                <div class="grid h-14 w-14 place-items-center rounded-2xl bg-bg-elev">
                    <Sprout :size="30" :stroke-width="1.6" class="text-accent" />
                </div>
                <div class="text-[20px] font-semibold tracking-tight text-ink">
                    AIOS<span class="text-accent">.</span>
                </div>
            </div>

            <h1 class="m-0 text-center text-[22px] font-semibold tracking-tight text-ink">
                {{ heading }}
            </h1>
            <p v-if="subhead" class="mt-1.5 text-center text-[13px] text-muted">
                {{ subhead }}
            </p>

            <form class="mt-7 flex flex-col gap-3" @submit.prevent="submit">
                <label v-if="isSetup" class="block">
                    <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
                        {{ t.languageLabel }}
                    </span>
                    <select
                        v-model="language"
                        class="text-input cursor-pointer"
                        :disabled="loading || applyingLanguage"
                    >
                        <option value="zh">{{ t.zh }}</option>
                        <option value="en">{{ t.en }}</option>
                    </select>
                </label>

                <label class="relative block">
                    <input
                        ref="inputRef"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        :autocomplete="isSetup ? 'new-password' : 'current-password'"
                        :placeholder="t.passwordPlaceholder"
                        class="text-input w-full pr-10"
                        @input="localError = ''"
                    />
                    <button
                        type="button"
                        class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-bg-hi hover:text-ink"
                        @click="showPassword = !showPassword"
                        :title="showPassword ? t.hide : t.show">
                        <component :is="showPassword ? EyeOff : Eye" :size="16" :stroke-width="1.8" />
                    </button>
                </label>

                <input
                    v-if="isSetup"
                    v-model="passwordConfirm"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    :placeholder="t.confirmPlaceholder"
                    class="text-input w-full"
                    @input="localError = ''"
                />

                <div v-if="applyingLanguage"
                     class="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-3 py-2 text-[13px] text-muted">
                    <Loader2 :size="15" :stroke-width="1.8" class="animate-spin text-accent" />
                    <span>{{ t.applying }}</span>
                </div>

                <div v-if="error"
                     class="rounded-[10px] bg-[color-mix(in_srgb,var(--color-bad)_12%,transparent)] px-3 py-2 text-[13px] text-bad">
                    {{ error }}
                </div>

                <button type="submit"
                        class="save-btn mt-1 w-full"
                        :disabled="!canSubmit || applyingLanguage">
                    {{ submitLabel }}
                </button>
            </form>

            <p v-if="!isSetup" class="mt-6 text-center text-[11.5px] leading-[1.6] text-faint">
                {{ t.forgot }}<br/>
                <code class="rounded bg-bg-hi px-1.5 py-0.5 font-mono text-[11px]">
                    sqlite3 database/aios.db "DELETE FROM auth; DELETE FROM sessions;"
                </code>
            </p>
        </div>
    </div>
</template>
