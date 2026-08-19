<template>
  <section class="space-y-4">
    <div>
      <div class="text-xs font-medium text-[#a0907a] dark:text-[#6a5840] mb-1.5">__T_SETTINGS_PROVIDER__</div>
      <select
        :value="provider"
        @change="onProviderChange"
        class="w-full px-3 py-2.5 rounded-lg text-[13px] bg-[#fffdf8] border border-[#dcd0b8] text-[#4a3a28] outline-none focus:border-[#b08a40] transition-colors cursor-pointer appearance-none dark:bg-[rgba(30,22,14,0.8)] dark:border-[#2a1e14] dark:text-[#e8dcc8] dark:focus:border-[#c8a060]"
        style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 12px center;"
      >
        <optgroup v-for="group in PROVIDER_GROUPS" :key="group.id" :label="group.name">
          <option v-for="p in getProvidersByGroup(group.id)" :key="p.id" :value="p.id">{{ p.name }}</option>
        </optgroup>
      </select>
    </div>

    <!-- Auth method toggle -->
    <div v-if="providerSupportsOAuth" class="flex gap-2">
      <button
        v-for="m in authMethods"
        :key="m.id"
        class="flex-1 rounded-lg border px-3 py-2 text-[12px] tracking-wide transition-all cursor-pointer"
        :class="authMethod === m.id
          ? 'border-[#b08a40] bg-[rgba(176,138,64,0.08)] text-[#b08a40] font-semibold dark:border-[#c8a060] dark:bg-[rgba(200,160,96,0.1)] dark:text-[#c8a060]'
          : 'border-[#dcd0b8] text-[#b8a888] hover:border-[#b8a888] dark:border-[#2a1e14] dark:text-[#6a5840] dark:hover:border-[#5a4a35]'"
        @click="$emit('update:auth-method', m.id)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- API Key mode -->
    <template v-if="authMethod !== 'oauth'">
      <div>
        <div class="text-xs font-medium text-[#a0907a] dark:text-[#6a5840] mb-1.5">__T_SETTINGS_API_URL__</div>
        <input
          :value="apiUrl"
          @input="$emit('update:api-url', $event.target.value)"
          placeholder="https://api.example.com/v1/chat/completions"
          class="w-full px-3 py-2.5 rounded-lg text-[13px] bg-[#fffdf8] border border-[#dcd0b8] text-[#4a3a28] placeholder-[#c0b098] outline-none focus:border-[#b08a40] transition-colors dark:bg-[rgba(30,22,14,0.8)] dark:border-[#2a1e14] dark:text-[#e8dcc8] dark:placeholder-[#3a2a1a] dark:focus:border-[#c8a060]"
        />
      </div>

      <div>
        <div class="text-xs font-medium text-[#a0907a] dark:text-[#6a5840] mb-1.5">__T_SETTINGS_API_KEY__</div>
        <input
          :value="apiKey"
          @input="$emit('update:api-key', $event.target.value)"
          type="password"
          placeholder="__T_SETTINGS_API_KEY__"
          class="w-full px-3 py-2.5 rounded-lg text-[13px] bg-[#fffdf8] border border-[#dcd0b8] text-[#4a3a28] placeholder-[#c0b098] outline-none focus:border-[#b08a40] transition-colors dark:bg-[rgba(30,22,14,0.8)] dark:border-[#2a1e14] dark:text-[#e8dcc8] dark:placeholder-[#3a2a1a] dark:focus:border-[#c8a060]"
        />
      </div>
    </template>

    <!-- OAuth mode -->
    <div v-else class="rounded-lg border border-[#dcd0b8] dark:border-[#2a1e14] bg-[#fffdf8] dark:bg-[rgba(30,22,14,0.8)] p-4">
      <div v-if="isOAuthConnected" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-green-500"></div>
          <span class="text-[13px] text-[#4a3a28] dark:text-[#a09078]">__T_SETTINGS_OAUTH_CONNECTED__</span>
        </div>
        <button
          @click="disconnectOAuth"
          class="text-[12px] text-[#b8a888] hover:text-[#a94f4f] dark:text-[#6a5840] dark:hover:text-[#c85050] transition-colors cursor-pointer"
        >__T_SETTINGS_OAUTH_DISCONNECT__</button>
      </div>
      <div v-else>
        <p class="mb-3 text-[12px] text-[#b8a888] dark:text-[#6a5840]">__T_SETTINGS_OAUTH_HINT__</p>
        <button
          class="rounded-lg bg-[#10a37f] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#0d8c6d] transition-colors cursor-pointer disabled:opacity-40"
          :disabled="oauthPending"
          @click="startOAuth"
        >{{ oauthPending ? '__T_SETTINGS_OAUTH_CONNECTING__' : '__T_SETTINGS_OAUTH_LOGIN__' }}</button>
      </div>
    </div>

    <div>
      <div class="text-xs font-medium text-[#a0907a] dark:text-[#6a5840] mb-1.5">__T_SETTINGS_MODEL__</div>
      <input
        :value="model"
        @input="$emit('update:model', $event.target.value)"
        placeholder="__T_SETTINGS_MODEL_PLACEHOLDER__"
        class="w-full px-3 py-2.5 rounded-lg text-[13px] bg-[#fffdf8] border border-[#dcd0b8] text-[#4a3a28] placeholder-[#c0b098] outline-none focus:border-[#b08a40] transition-colors dark:bg-[rgba(30,22,14,0.8)] dark:border-[#2a1e14] dark:text-[#e8dcc8] dark:placeholder-[#3a2a1a] dark:focus:border-[#c8a060]"
      />
    </div>

    <div class="pt-2 flex justify-start">
      <button @click="$emit('save')" class="px-5 py-2 rounded-lg text-[13px] font-semibold bg-gradient-to-br from-[#c8a060] to-[#a07840] text-[#1a1410] cursor-pointer hover:opacity-85 transition-opacity">__T_COMMON_SAVE__</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { PROVIDER_GROUPS, getProvidersByGroup, getProvider } from '../../data/providers.js';

const props = defineProps({
  provider: { type: String, default: 'openrouter' },
  apiUrl: { type: String, default: '' },
  apiKey: { type: String, default: '' },
  model: { type: String, default: '' },
  authMethod: { type: String, default: 'apikey' },
  oauthConnected: { type: Boolean, default: false }
});

const emit = defineEmits([
  'update:provider',
  'update:api-url',
  'update:api-key',
  'update:model',
  'update:auth-method',
  'save'
]);

const oauthPending = ref(false);
const isOAuthConnected = ref(props.oauthConnected);

const authMethods = [
  { id: 'apikey', label: 'API Key' },
  { id: 'oauth', label: 'OAuth __T_SETTINGS_OAUTH_LOGIN_SHORT__' }
];

const providerSupportsOAuth = computed(() => {
  const p = getProvider(props.provider);
  return p?.supportsOAuth === true;
});

const onProviderChange = (e) => {
  const value = e.target.value;
  emit('update:provider', value);
  // Reset to apikey when switching providers
  emit('update:auth-method', 'apikey');
  isOAuthConnected.value = false;
};

const startOAuth = async () => {
  oauthPending.value = true;
  try {
    const res = await fetch('/aios/api/auth/openai/authorize', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed');

    window.open(data.authorizationUrl, '_blank');

    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch('/aios/api/auth/openai/poll', {
          method: 'POST',
          credentials: 'include'
        });
        const pollData = await pollRes.json();
        if (pollData.status === 'pending') return;

        clearInterval(pollInterval);
        if (pollData.status === 'complete') {
          isOAuthConnected.value = true;
          emit('update:auth-method', 'oauth');
        }
        oauthPending.value = false;
      } catch {
        clearInterval(pollInterval);
        oauthPending.value = false;
      }
    }, 1500);
  } catch {
    oauthPending.value = false;
  }
};

const disconnectOAuth = async () => {
  try {
    await fetch('/aios/api/auth/openai/disconnect', {
      method: 'POST',
      credentials: 'include'
    });
  } catch {}
  isOAuthConnected.value = false;
  emit('update:auth-method', 'apikey');
};
</script>
