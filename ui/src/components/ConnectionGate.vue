<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';

const auth = useAuthStore();
const route = useRoute();

const show = computed(() => {
    if (route.name === 'guard') return false;
    return !auth.showActions;
});

const status = computed(() => {
    if (auth.state === 'offline')return { id: 'offline',    label: '连接已断开,重连中…' };
    if (!auth.authenticated)
                               return { id: 'pending',    label: '等待认证…' };
    return                           { id: 'pending',    label: '连接中…' };
});
</script>

<template>
    <Transition name="gate-fade">
        <div v-if="show" class="gate-bg">
            <div class="gate-card">
                <div class="gem">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <defs>
                            <linearGradient id="AIOSGateGem" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0"  stop-color="var(--gem-3)"/>
                                <stop offset=".5" stop-color="var(--gem-2)"/>
                                <stop offset="1"  stop-color="var(--gem-1)"/>
                            </linearGradient>
                        </defs>
                        <path d="M12 2c.6 4 3 6.4 7 7-4 .6-6.4 3-7 7-.6-4-3-6.4-7-7 4-.6 6.4-3 7-7z"
                              fill="url(#AIOSGateGem)"/>
                    </svg>
                </div>
                <div class="brand">AIOS<span class="dot">.</span></div>
                <div class="status">
                    <span class="gate-dot" :data-state="status.id"></span>
                    <span class="t">{{ status.label }}</span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.gate-bg {
    position: fixed; inset: 0; z-index: 60;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--color-bg) 78%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}
.gate-card {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 32px 36px;
    background: var(--color-bg-elev);
    border: 1px solid var(--color-line);
    border-radius: 24px;
    box-shadow: var(--shadow-lg);
    min-width: 240px;
}
.gem {
    width: 56px; height: 56px;
    border-radius: 50%;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--color-bg-hi) 60%, transparent);
}
.gem svg { width: 32px; height: 32px; }

.brand {
    font-size: 24px; font-weight: 600; line-height: 1;
    letter-spacing: -0.02em;
    color: var(--color-ink);
}
.brand .dot { color: var(--color-accent); margin-left: 2px; }

.status {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--color-muted);
    margin-top: 2px;
}
.gate-dot {
    width: 8px; height: 8px; border-radius: 999px;
    background: var(--color-faint); display: inline-block;
}
.gate-dot[data-state="pending"] { background: var(--color-accent); animation: gate-pulse 1.4s ease-in-out infinite; }
.gate-dot[data-state="offline"] { background: var(--color-bad); }
@keyframes gate-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
}

.gate-fade-enter-active, .gate-fade-leave-active { transition: opacity .18s ease; }
.gate-fade-enter-from, .gate-fade-leave-to { opacity: 0; }
</style>
