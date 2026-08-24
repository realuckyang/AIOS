<script setup>
import { ref, reactive, markRaw } from 'vue';
import { Hammer, LayoutGrid, AlertTriangle, Loader2 } from 'lucide-vue-next';
import { on } from '../system/ws.js';

const visible = ref(false);
const serverMessage = ref('');
const sending = ref(false);
const error = ref('');
const done = ref(false);

const options = reactive({
    build: false,
    restartApps: false,
    restartServer: false,
});

on('reload_request', (data) => {
    options.build = data.build || false;
    options.restartApps = data.restartApps || false;
    options.restartServer = data.restartServer || false;
    serverMessage.value = data.message || '';
    done.value = false;
    visible.value = true;
});

const needsReload = () => options.build || options.restartServer;

const confirm = async () => {
    sending.value = true;
    error.value = '';
    try {
        const res = await fetch('/api/runtime/reload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                build: options.build,
                restartApps: options.restartApps,
                restartServer: options.restartServer,
            }),
        });
        const data = await res.json();
        if (!data.success) {
            error.value = data.message || '重启失败';
            sending.value = false;
            return;
        }
        if (needsReload()) {
            done.value = true;
            // 等服务重启后自动刷新
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            visible.value = false;
        }
    } catch (e) {
        // Server may have died already (restartServer), reload anyway
        if (needsReload()) {
            setTimeout(() => location.reload(), 1000);
            return;
        }
        error.value = e.message;
    } finally {
        sending.value = false;
    }
};

const cancel = () => {
    visible.value = false;
};

const items = [
    { key: 'build', label: '重新构建前端', desc: '构建 ui/ 下的改动，生成 dist/', icon: markRaw(Hammer) },
    { key: 'restartApps', label: '重启应用服务', desc: '重启 9503 端口，应用后端代码生效', icon: markRaw(LayoutGrid) },
    { key: 'restartServer', label: '重启主服务', desc: '重启 9502 端口，主系统和 API 生效（中断当前任务）', icon: markRaw(AlertTriangle) },
];
</script>

<template>
    <Teleport to="body">
        <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center"
             style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px)">
            <div class="rounded-2xl border border-line bg-bg-elev p-6 shadow-xl max-w-[460px] w-full mx-4">

                <!-- 等待重启 -->
                <template v-if="done">
                    <div class="flex flex-col items-center gap-3 py-4">
                        <Loader2 :size="36" :stroke-width="1.6" class="animate-spin" style="color:var(--color-accent)" />
                        <p class="m-0 text-[15px] font-medium text-ink">服务重启中，即将自动刷新…</p>
                    </div>
                </template>

                <!-- 选择界面 -->
                <template v-else>
                    <h2 class="m-0 mb-1 text-[18px] font-semibold text-ink">重启系统</h2>
                    <p v-if="serverMessage" class="mb-4 text-[13px] text-muted">{{ serverMessage }}</p>
                    <p v-else class="mb-4 text-[13px] text-muted">选择需要执行的操作：</p>

                    <div class="mb-5 flex flex-col gap-3">
                        <label v-for="item in items" :key="item.key"
                            class="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer transition-colors"
                            :class="options[item.key] ? 'border-[var(--color-accent)]' : 'hover:border-soft'"
                            style="background:color-mix(in srgb, var(--color-accent) 4%, transparent)">
                            <input type="checkbox" v-model="options[item.key]"
                                class="mt-0.5 h-4 w-4 rounded accent-[var(--color-accent)]" />
                            <div class="flex-1">
                                <div class="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                                    <component :is="item.icon" :size="16" :stroke-width="1.8" style="color:var(--color-accent)" />
                                    {{ item.label }}
                                </div>
                                <div class="mt-0.5 text-[12px] text-muted">{{ item.desc }}</div>
                            </div>
                        </label>
                    </div>

                    <div v-if="error" class="mb-3 rounded-[8px] px-3 py-2 text-[13px] text-bad"
                         style="background:color-mix(in srgb, var(--color-bad) 12%, transparent)">
                        {{ error }}
                    </div>

                    <div class="flex justify-end gap-2">
                        <button @click="cancel"
                            class="rounded-full border border-line bg-bg px-4 py-2 text-[13px] font-medium text-muted hover:bg-bg-hi">
                            取消
                        </button>
                        <button @click="confirm" :disabled="sending || (!options.build && !options.restartApps && !options.restartServer)"
                            class="rounded-full border-0 px-5 py-2 text-[13px] font-medium text-white transition-opacity"
                            style="background:var(--color-accent)"
                            :style="{ opacity: sending ? 0.6 : 1 }">
                            {{ sending ? '重启中…' : '确认重启' }}
                        </button>
                    </div>
                </template>

            </div>
        </div>
    </Teleport>
</template>
