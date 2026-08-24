<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const showPassword = ref(false);
const inputRef = ref(null);
const localError = ref('');

const error = computed(() => localError.value || auth.authError || '');

const canSubmit = computed(() => {
    if (loading.value) return false;
    if (password.value.length < 8) return false;
    if (password.value !== passwordConfirm.value) return false;
    return true;
});

async function submit() {
    localError.value = '';
    if (password.value.length < 8) {
        localError.value = '密码至少 8 位';
        return;
    }
    if (password.value !== passwordConfirm.value) {
        localError.value = '两次输入的密码不一致';
        return;
    }
    loading.value = true;
    try {
        const ok = await auth.setupPassword(password.value);
        if (ok) {
            password.value = '';
            passwordConfirm.value = '';
            router.replace('/');
        }
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await auth.refreshState().catch(() => {});
    if (auth.authenticated) {
        router.replace('/');
        return;
    }
    if (auth.configured) {
        router.replace({ name: 'login' });
        return;
    }
    await nextTick();
    inputRef.value?.focus();
});
</script>

<template>
    <div class="grid h-dvh w-screen grid-cols-1 overflow-hidden bg-[#f8f9fa] md:grid-cols-[1.15fr_1fr] max-md:h-auto max-md:min-h-dvh max-md:grid-rows-[auto_1fr]">
        <aside class="welcome-hero relative overflow-hidden text-[#f5f7fb]">
            <div class="pointer-events-none absolute inset-0" aria-hidden="true">
                <div class="absolute -left-[120px] -top-[100px] h-[420px] w-[420px] rounded-full opacity-55 bg-[radial-gradient(circle,#34a853_0%,transparent_70%)] blur-[60px]"></div>
                <div class="absolute -right-[160px] -bottom-[160px] h-[480px] w-[480px] rounded-full opacity-55 bg-[radial-gradient(circle,#1a73e8_0%,transparent_55%)] blur-[60px]"></div>
                <div class="hero-grid absolute inset-0"></div>
            </div>

            <div class="relative flex h-full flex-col gap-14 px-16 py-14 max-md:gap-7 max-md:px-8 max-md:pb-9 max-md:pt-10">
                <div class="flex items-center gap-3.5">
                    <div class="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(140deg,#34a853,#1e8e3e)] text-white shadow-[0_8px_22px_-10px_rgba(52,168,83,0.7)]">
                        <span class="msi" style="font-size:22px">eco</span>
                    </div>
                    <div class="text-[22px] font-bold tracking-tight text-[#f5f7fb]">
                        AIOS<span class="text-[#6dd49b]">.</span>
                    </div>
                </div>

                <div class="mt-auto flex flex-col gap-3 max-md:mt-0">
                    <h1 class="m-0 text-[44px] font-bold leading-[1.15] tracking-[-0.02em] text-white max-md:text-[30px]">
                        AI 时代的操作系统
                    </h1>
                    <p class="m-0 max-w-[460px] text-[15px] leading-[1.65] text-white/75 max-md:text-[14px]">
                        你说,它做。从一句话到一个应用,这是你和 AI 共同生活的桌面。
                    </p>
                </div>

                <div class="mt-2 flex flex-col gap-3.5 max-md:hidden">
                    <div class="flex items-start gap-3 pr-3">
                        <div class="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-[#6dd49b] shadow-[0_0_0_4px_rgba(109,212,155,0.18)]"></div>
                        <div class="min-w-0">
                            <div class="mb-0.5 text-[14px] font-semibold text-white">未来留于物形</div>
                            <div class="text-[12.5px] leading-[1.55] text-white/65">对话驱动,界面承载。AI 的能力,最终化为你看得见、用得着的形态。</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 pr-3">
                        <div class="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-[#6dd49b] shadow-[0_0_0_4px_rgba(109,212,155,0.18)]"></div>
                        <div class="min-w-0">
                            <div class="mb-0.5 text-[14px] font-semibold text-white">让软件真正走向每一个人</div>
                            <div class="text-[12.5px] leading-[1.55] text-white/65">告诉 AI 你想要什么,应用就在对话中诞生,为你而写,只属于你。</div>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 pr-3">
                        <div class="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-[#6dd49b] shadow-[0_0_0_4px_rgba(109,212,155,0.18)]"></div>
                        <div class="min-w-0">
                            <div class="mb-0.5 text-[14px] font-semibold text-white">应用也可以和 AI 对话</div>
                            <div class="text-[12.5px] leading-[1.55] text-white/65">每个应用都能调用 AI 的智慧,不再是孤立的工具,而是懂你的搭档。</div>
                        </div>
                    </div>
                </div>

                <div class="mt-auto font-mono text-[11px] tracking-[0.08em] text-white/40 max-md:hidden">
                    v0.1 · running locally
                </div>
            </div>
        </aside>

        <main class="flex items-center justify-center overflow-y-auto bg-white px-12 py-10 max-md:px-6 max-md:pb-12 max-md:pt-8">
            <div class="flex w-full max-w-[380px] flex-col gap-7">
                <div class="flex flex-col gap-1.5">
                    <h2 class="m-0 text-2xl font-bold tracking-tight text-ink">欢迎使用 AIOS</h2>
                    <p class="m-0 text-[13.5px] leading-[1.55] text-muted">为这台机器设置一个登录密码,然后开始使用。</p>
                </div>

                <form class="flex flex-col gap-3.5" @submit.prevent="submit">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-[11.5px] font-semibold tracking-[0.04em] text-muted">密码 (至少 8 位)</span>
                        <span class="relative block">
                            <input
                                ref="inputRef"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                autocomplete="new-password"
                                placeholder="密码 (至少 8 位)"
                                class="text-input w-full pr-10"
                                @input="localError = ''"
                            />
                            <button
                                type="button"
                                class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-bg-elev hover:text-ink"
                                @click="showPassword = !showPassword"
                                :title="showPassword ? '隐藏' : '显示'">
                                <span class="msi xxs">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                            </button>
                        </span>
                    </label>

                    <label class="flex flex-col gap-1.5">
                        <span class="text-[11.5px] font-semibold tracking-[0.04em] text-muted">再次输入密码</span>
                        <input
                            v-model="passwordConfirm"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            placeholder="再次输入密码"
                            class="text-input w-full"
                            @input="localError = ''"
                        />
                    </label>

                    <div v-if="error"
                         class="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--color-bad)_10%,transparent)] px-3 py-2.5 text-[13px] leading-snug text-bad">
                        {{ error }}
                    </div>

                    <button type="submit"
                            :disabled="!canSubmit"
                            class="mt-1 h-11 rounded-xl border-0 bg-[#1a73e8] text-[14px] font-semibold tracking-[0.01em] text-white shadow-[0_6px_18px_-8px_rgba(26,115,232,0.65)] transition-[background,box-shadow,transform] active:translate-y-px hover:bg-[#174ea6] hover:shadow-[0_10px_24px_-10px_rgba(26,115,232,0.8)] disabled:cursor-not-allowed disabled:bg-[#aecbfa] disabled:text-white disabled:shadow-none disabled:hover:bg-[#aecbfa]">
                        {{ loading ? '设置中...' : '设置密码并进入' }}
                    </button>
                </form>
            </div>
        </main>
    </div>
</template>

<style scoped>
.welcome-hero {
    background:
        radial-gradient(120% 80% at 0% 0%, #1f3b5e 0%, transparent 60%),
        radial-gradient(100% 80% at 100% 100%, #0f2a4a 0%, transparent 55%),
        linear-gradient(135deg, #0d1b2e 0%, #14253b 100%);
}
.hero-grid {
    background-image:
        linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
}
</style>
