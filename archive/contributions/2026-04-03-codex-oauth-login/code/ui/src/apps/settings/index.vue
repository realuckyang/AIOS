<template>
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f0e8] dark:bg-[#1a1410]">
    <div class="px-4 pt-4 shrink-0">
      <div class="max-w-lg mx-auto flex items-center gap-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-3.5 py-1.5 text-xs shrink-0 cursor-pointer transition-all rounded-full font-medium"
          :class="activeTab === tab.key
            ? 'bg-[rgba(90,58,40,0.1)] text-[#5a3e28] dark:bg-[rgba(200,160,96,0.12)] dark:text-[#c8a060]'
            : 'text-[#b8a888] hover:text-[#7a6a50] hover:bg-[rgba(90,58,40,0.06)] dark:text-[#6a5840] dark:hover:text-[#a08c70] dark:hover:bg-[rgba(200,160,96,0.06)]'"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-5">
      <div class="max-w-lg mx-auto">
        <AccountTab
          v-if="activeTab === 'account'"
          :username="accountUsername"
          :old-password="oldPassword"
          :new-password="newPassword"
          :confirm-password="confirmPassword"
          @update:old-password="oldPassword = $event"
          @update:new-password="newPassword = $event"
          @update:confirm-password="confirmPassword = $event"
          @change-password="changePassword"
          @logout="logout"
        />
        <ModelTab
          v-else-if="activeTab === 'model'"
          :provider="provider"
          :api-url="editApiUrl"
          :api-key="editApiKey"
          :model="editModel"
          :auth-method="authMethod"
          :oauth-connected="oauthConnected"
          @save="save"
          @update:provider="onProviderChange"
          @update:api-url="editApiUrl = $event"
          @update:api-key="editApiKey = $event"
          @update:model="editModel = $event"
          @update:auth-method="authMethod = $event"
        />
        <ToolTab
          v-else-if="activeTab === 'tools'"
          :enable-tool-result-truncate="enableToolResultTruncate"
          :tool-result-max-chars="toolResultMaxChars"
          :enable-tool-loop-limit="enableToolLoopLimit"
          :tool-max-rounds="toolMaxRounds"
          @save="save"
          @update:enable-tool-result-truncate="enableToolResultTruncate = $event"
          @update:tool-result-max-chars="toolResultMaxChars = $event"
          @update:enable-tool-loop-limit="enableToolLoopLimit = $event"
          @update:tool-max-rounds="toolMaxRounds = $event"
        />
        <ContextTab
          v-else-if="activeTab === 'messages'"
          :context-rounds="editRounds"
          @save="save"
          @update:context-rounds="editRounds = $event"
        />
        <SkillTab
          v-else-if="activeTab === 'skills'"
          :items="skillItems"
          :loading="skillsLoading"
          :error="skillsError"
          @refresh="fetchSkills"
        />
        <AboutTab v-else />
      </div>

      <!--
      <p class="mx-auto mt-6 max-w-lg px-1 pb-4 text-center text-[12px] italic leading-6 text-[#9b896e]">
        <span class="block">“The people who are crazy enough to think they can change the world are the ones who do.”</span>
        <span class="mt-1 block">Think Different</span>
      </p>
      -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AccountTab from './AccountTab.vue';
import ModelTab from './ModelTab.vue';
import ContextTab from './ContextTab.vue';
import ToolTab from './ToolTab.vue';
import AboutTab from './AboutTab.vue';
import SkillTab from './SkillTab.vue';
import { getProvider } from '../../data/providers.js';
import { toast } from '../../stores/toast.js';
const router = useRouter();
const tabs = [
  { key: 'account', label: '__T_SETTINGS_TAB_ACCOUNT__' },
  { key: 'model', label: '__T_SETTINGS_TAB_MODEL__' },
  { key: 'tools', label: '__T_SETTINGS_TAB_TOOLS__' },
  { key: 'messages', label: '__T_SETTINGS_TAB_MESSAGES__' },
  { key: 'skills', label: '__T_SETTINGS_TAB_SKILLS__' },
  { key: 'about', label: '__T_SETTINGS_TAB_ABOUT__' }
];

const activeTab = ref('account');
const provider = ref('openai');
const editRounds = ref(100);
const enableToolResultTruncate = ref(true);
const toolResultMaxChars = ref(12000);
const enableToolLoopLimit = ref(true);
const toolMaxRounds = ref(50);
const editApiUrl = ref('');
const editApiKey = ref('');
const editModel = ref('');
const authMethod = ref('apikey');
const oauthConnected = ref(false);
const accountUsername = ref('');
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const providerConfigs = ref({});
const skillItems = ref([]);
const skillsLoading = ref(false);
const skillsError = ref('');

const PROVIDER_CONFIGS_KEY = 'aios.providerConfigs.v1';

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `${res.status} ${res.statusText}`);
  return data;
};

const loadProviderConfigs = () => {
  try {
    const raw = localStorage.getItem(PROVIDER_CONFIGS_KEY);
    providerConfigs.value = raw ? JSON.parse(raw) : {};
  } catch {
    providerConfigs.value = {};
  }
};

const saveProviderConfigs = () => {
  localStorage.setItem(PROVIDER_CONFIGS_KEY, JSON.stringify(providerConfigs.value));
};

const applyProviderConfig = (providerId) => {
  const saved = providerConfigs.value[providerId];
  if (saved) {
    editApiUrl.value = saved.apiUrl || '';
    editApiKey.value = saved.apiKey || '';
    editModel.value = saved.model || '';
    return;
  }

  const preset = getProvider(providerId);
  if (providerId === 'custom') {
    editApiUrl.value = '';
    editApiKey.value = '';
    editModel.value = '';
    return;
  }
  editApiUrl.value = preset?.apiUrl || '';
  editApiKey.value = '';
  editModel.value = preset?.defaultModel || '';
};

const onProviderChange = (nextProvider) => {
  provider.value = nextProvider;
  applyProviderConfig(nextProvider);
};

const fetchSettings = async () => {
  const data = await request('/aios/api/settings');
  provider.value = data.provider || 'openai';
  editRounds.value = data.contextRounds || 100;
  enableToolResultTruncate.value = data.enableToolResultTruncate !== false;
  toolResultMaxChars.value = Number(data.toolResultMaxChars) || 12000;
  enableToolLoopLimit.value = data.enableToolLoopLimit !== false;
  toolMaxRounds.value = Number(data.toolMaxRounds) || 50;
  editApiUrl.value = data.apiUrl || '';
  editApiKey.value = data.apiKey || '';
  editModel.value = data.model || '';
  authMethod.value = data.authMethod || 'apikey';
  oauthConnected.value = data.oauthConnected === true;
  providerConfigs.value[provider.value] = {
    apiUrl: editApiUrl.value,
    apiKey: editApiKey.value,
    model: editModel.value
  };
  saveProviderConfigs();
};

const fetchMe = async () => {
  const data = await request('/aios/api/auth/me');
  accountUsername.value = data?.user?.username || '';
};

const fetchSkills = async () => {
  skillsLoading.value = true;
  skillsError.value = '';
  try {
    const data = await request('/aios/api/settings/skills');
    skillItems.value = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    skillsError.value = '__T_SETTINGS_SKILLS_LOAD_FAILED__'.replace('{message}', e.message);
  } finally {
    skillsLoading.value = false;
  }
};

const save = async () => {
  try {
    const maxChars = Math.max(1000, Math.min(50000, Number(toolResultMaxChars.value) || 12000));
    const maxRounds = Math.max(1, Math.min(500, Number(toolMaxRounds.value) || 50));
    toolResultMaxChars.value = maxChars;
    toolMaxRounds.value = maxRounds;

    await request('/aios/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider.value,
        contextRounds: editRounds.value,
        enableToolResultTruncate: enableToolResultTruncate.value,
        toolResultMaxChars: maxChars,
        enableToolLoopLimit: enableToolLoopLimit.value,
        toolMaxRounds: maxRounds,
        apiUrl: editApiUrl.value,
        apiKey: editApiKey.value,
        model: editModel.value,
        authMethod: authMethod.value
      })
    });

    providerConfigs.value[provider.value] = {
      apiUrl: editApiUrl.value,
      apiKey: editApiKey.value,
      model: editModel.value
    };
    saveProviderConfigs();
    toast.show('__T_SETTINGS_SAVED__');
  } catch (e) {
    toast.show('__T_SETTINGS_SAVE_FAILED__'.replace('{message}', e.message), { type: 'error' });
  }
};

const changePassword = async () => {
  try {
    if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
      throw new Error('__T_SETTINGS_PASSWORD_REQUIRED__');
    }
    if (newPassword.value !== confirmPassword.value) {
      throw new Error('__T_SETTINGS_PASSWORD_MISMATCH__');
    }

    await request('/aios/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
      })
    });

    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    toast.show('__T_SETTINGS_PASSWORD_CHANGED_RELOGIN__');
    await logout();
  } catch (e) {
    toast.show('__T_SETTINGS_SAVE_FAILED__'.replace('{message}', e.message), { type: 'error' });
  }
};

const logout = async () => {
  try {
    await request('/aios/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {}
  await router.push('/login');
};

onMounted(async () => {
  loadProviderConfigs();
  await Promise.all([fetchMe(), fetchSettings(), fetchSkills()]);
});
</script>
