<template>
  <div class="relative min-h-screen overflow-hidden bg-[#1a1410] text-[#e8d4b8] font-['Georgia','PingFang_SC',serif]">
    <!-- 背景纹理 -->
    <div
      class="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_6px,rgba(255,255,255,0.015)_6px,rgba(255,255,255,0.015)_7px),radial-gradient(ellipse_at_50%_0%,rgba(200,160,96,0.12),transparent_60%)]">
    </div>

    <!-- 顶栏 -->
    <div
      class="relative z-10 flex h-12 items-center border-b-2 border-[#3a2010] bg-[linear-gradient(180deg,#5a3e28,#4a3020)] px-6 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
      <span class="text-[15px] font-bold tracking-[0.12em] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">AIOS</span>
    </div>

    <!-- 内容 -->
    <div class="relative z-[1] flex h-[calc(100vh-48px)] items-center justify-center p-5">
      <div
        class="w-[540px] max-w-[96vw] overflow-hidden rounded-[14px] border border-[#3a2a18] bg-[linear-gradient(180deg,#2e2218,#261c14)] shadow-[0_16px_60px_rgba(0,0,0,0.6)]">
        <!-- 进度条 -->
        <div class="h-[3px] bg-[#2a1e14]">
          <div class="h-full bg-[linear-gradient(90deg,#c8a060,#d4b878)] transition-all duration-500"
            :style="{ width: step / 4 * 100 + '%' }"></div>
        </div>

        <!-- Step 1: 欢迎 + 语言选择 -->
        <div v-if="step === 1" class="px-10 py-12">
          <h2
            class="bg-gradient-to-r from-[#e8d4b8] to-[#c8a060] bg-clip-text text-[60px] font-extrabold leading-none tracking-tight text-transparent">
            AIOS</h2>
          <div class="mt-8 h-px w-full bg-gradient-to-r from-[#c8a060] to-transparent opacity-30"></div>
          <p class="mt-8 max-w-[450px] space-y-3 text-[14px] leading-relaxed tracking-wide text-[#a09078]">
            <span>{{ t.desc_1 }}</span><br>
            <span>{{ t.desc_2 }}</span><br>
            <span>{{ t.desc_3 }}</span>
          </p>
          <div class="mt-12 flex items-end justify-between">
            <div class="flex gap-4">
              <button v-for="lang in [{ id: 'zh', label: '中文' }, { id: 'en', label: 'English' }]" :key="lang.id"
                class="relative text-[13px] tracking-wider transition-colors cursor-pointer"
                :class="model.language === lang.id ? 'text-[#c8a060] font-bold after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-[#c8a060]' : 'text-[#6a5840] hover:text-[#a08c70]'"
                @click="model.language = lang.id">{{ lang.label }}</button>
            </div>
            <button
              class="rounded bg-[#c8a060] px-8 py-3 text-[14px] font-semibold text-[#1a1008] hover:bg-[#d4b070] shadow-[0_4px_14px_rgba(200,160,96,0.3)] transition-all cursor-pointer"
              @click="step = 2">{{ t.next }}</button>
          </div>
        </div>

        <!-- Step 2: 创建管理员 -->
        <div v-if="step === 2" class="px-10 py-10">
          <h2 class="text-2xl font-bold tracking-wide text-[#e8d4b8]">{{ t.admin_title }}</h2>
          <p class="mt-2 text-[13px] text-[#8a7860]">{{ t.admin_hint }}</p>

          <div class="mt-8 space-y-5">
            <div>
              <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.username }}</label>
              <input v-model.trim="admin.username" :placeholder="t.username_ph" class="wiz-input" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.password }}</label>
                <input v-model="admin.password" type="password" :placeholder="t.password_ph" class="wiz-input" />
              </div>
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.confirm }}</label>
                <input v-model="admin.confirm" type="password" :placeholder="t.confirm_ph" class="wiz-input" />
              </div>
            </div>
          </div>
          <div v-if="error" class="mt-4 rounded-lg border border-[#a94f4f] bg-[#5a2727]/80 px-3 py-2 text-sm">{{ error }}</div>

          <div class="mt-10 flex items-center justify-between">
            <button class="text-[13px] tracking-wide text-[#6a5840] hover:text-[#c8a060] transition-colors cursor-pointer"
              @click="step = 1">{{ t.prev }}</button>
            <button
              class="rounded bg-[#c8a060] px-8 py-3 text-[14px] font-semibold text-[#1a1008] hover:bg-[#d4b070] shadow-[0_4px_14px_rgba(200,160,96,0.3)] transition-all disabled:opacity-40 cursor-pointer"
              :disabled="pending" @click="createAdmin">
              {{ pending ? t.creating : t.next }}
            </button>
          </div>
        </div>

        <!-- Step 3: 配置模型 -->
        <div v-if="step === 3" class="px-10 py-10">
          <h2 class="text-2xl font-bold tracking-wide text-[#e8d4b8]">{{ t.model_title }}</h2>
          <p class="mt-2 text-[13px] text-[#8a7860]">{{ t.model_hint }}</p>

          <div class="mt-8 space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.provider }}</label>
                <select v-model="model.provider" class="wiz-input wiz-select" @change="applyProviderDefault">
                  <optgroup v-for="group in PROVIDER_GROUPS" :key="group.id" :label="group.name">
                    <option v-for="p in getProvidersByGroup(group.id)" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.model_label }}</label>
                <input v-model.trim="model.model" placeholder="gpt-5.4" class="wiz-input" />
              </div>
            </div>

            <!-- Auth method toggle (only for providers that support OAuth) -->
            <div v-if="currentProviderSupportsOAuth" class="flex gap-3">
              <button
                v-for="m in [{ id: 'apikey', label: t.auth_apikey }, { id: 'oauth', label: t.auth_oauth }]"
                :key="m.id"
                class="relative flex-1 rounded-lg border px-4 py-2.5 text-[13px] tracking-wide transition-all cursor-pointer"
                :class="model.authMethod === m.id
                  ? 'border-[#c8a060] bg-[rgba(200,160,96,0.1)] text-[#c8a060] font-semibold'
                  : 'border-[#3a2a18] text-[#6a5840] hover:border-[#5a4a35] hover:text-[#a08c70]'"
                @click="model.authMethod = m.id">
                {{ m.label }}
              </button>
            </div>

            <!-- API Key fields (shown when authMethod is apikey) -->
            <template v-if="model.authMethod !== 'oauth'">
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.api_url }}</label>
                <input v-model.trim="model.apiUrl" placeholder="https://..." class="wiz-input" />
              </div>
              <div>
                <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">{{ t.api_key }}</label>
                <input v-model.trim="model.apiKey" placeholder="sk-..." class="wiz-input" />
              </div>
            </template>

            <!-- OAuth login (shown when authMethod is oauth) -->
            <div v-else class="rounded-lg border border-[#3a2a18] bg-[rgba(0,0,0,0.2)] p-5">
              <div v-if="oauthConnected" class="flex items-center gap-3">
                <div class="h-2 w-2 rounded-full bg-green-500"></div>
                <span class="text-[13px] text-[#a09078]">{{ t.oauth_connected }}</span>
              </div>
              <div v-else>
                <p class="mb-4 text-[13px] leading-relaxed text-[#8a7860]">{{ t.oauth_hint }}</p>
                <button
                  class="rounded bg-[#10a37f] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0d8c6d] shadow-[0_4px_14px_rgba(16,163,127,0.3)] transition-all cursor-pointer disabled:opacity-40"
                  :disabled="pending"
                  @click="startOAuthLogin">
                  {{ pending ? t.oauth_connecting : t.oauth_login }}
                </button>
              </div>
              <div class="mt-4 space-y-3 border-t border-[#3a2a18] pt-4">
                <p class="text-[11px] uppercase tracking-widest text-[#6a5840]">{{ t.oauth_manual_hint }}</p>
                <div>
                  <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">Access Token</label>
                  <input v-model.trim="model.accessToken" placeholder="eyJhbGci..." class="wiz-input" />
                </div>
                <div>
                  <label class="mb-2 block text-[11px] uppercase tracking-widest text-[#8a7860]">Refresh Token</label>
                  <input v-model.trim="model.refreshToken" placeholder="eyJhbGci..." class="wiz-input" />
                </div>
              </div>
            </div>
          </div>
          <div v-if="error" class="mt-4 rounded-lg border border-[#a94f4f] bg-[#5a2727]/80 px-3 py-2 text-sm">{{ error }}</div>

          <div class="mt-10 flex items-center justify-between">
            <button class="text-[13px] tracking-wide text-[#6a5840] hover:text-[#c8a060] transition-colors cursor-pointer"
              @click="step = 2">{{ t.prev }}</button>
            <button
              v-if="model.authMethod !== 'oauth'"
              class="rounded bg-[#c8a060] px-8 py-3 text-[14px] font-semibold text-[#1a1008] hover:bg-[#d4b070] shadow-[0_4px_14px_rgba(200,160,96,0.3)] transition-all disabled:opacity-40 cursor-pointer"
              :disabled="pending" @click="saveModelAndTest">
              {{ pending ? t.testing : t.save_test }}
            </button>
            <button
              v-else-if="oauthConnected || model.accessToken"
              class="rounded bg-[#c8a060] px-8 py-3 text-[14px] font-semibold text-[#1a1008] hover:bg-[#d4b070] shadow-[0_4px_14px_rgba(200,160,96,0.3)] transition-all disabled:opacity-40 cursor-pointer"
              :disabled="pending" @click="saveOAuthAndTest">
              {{ pending ? t.testing : t.save_test }}
            </button>
          </div>
        </div>

        <!-- Step 4: 完成 -->
        <div v-if="step === 4" class="px-10 py-12">
          <div class="flex items-start gap-6">
            <div>
              <h2 class="text-2xl font-bold tracking-wide text-[#e8d4b8]">{{ t.intro_title }}</h2>
              <p class="mt-2 text-[13px] text-[#8a7860]">{{ t.intro_hint }}</p>
            </div>
          </div>

          <div
            class="mt-8 min-h-[100px] rounded-lg border border-[rgba(200,160,96,0.2)] bg-[rgba(0,0,0,0.3)] p-6 text-[14px] leading-relaxed tracking-wide text-[#c8b898]">
            <span>{{ displayedText }}</span><span v-if="typing"
              class="ml-0.5 inline-block h-[1em] w-[4px] animate-pulse bg-[#c8a060] align-text-bottom"></span>
          </div>

          <div class="mt-12 flex flex-col items-center gap-4 transition-opacity duration-500"
            :class="typing ? 'opacity-0' : 'opacity-100'">
            <p class="text-[12px] tracking-wide text-[#a09078]">
              {{ installMessage }}
            </p>
            <button
              class="cursor-pointer rounded bg-[#c8a060] px-10 py-3 text-[14px] font-semibold text-[#1a1008] shadow-[0_4px_14px_rgba(200,160,96,0.3)] transition-all hover:bg-[#d4b070] disabled:cursor-wait disabled:bg-[#8a7860] disabled:text-[#2a1e14]"
              :disabled="installing || !installReady"
              @click="enterSystem"
            >{{ enterButtonLabel }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { PROVIDER_GROUPS, getProvidersByGroup, getProvider } from '../data/providers.js';
import { clearAuthCache } from '../auth/session.js';

const texts = {
  zh: {
    desc_1: '欢迎使用 AIOS。',
    desc_2: '我致力于将您的想法转化为实际行动，高效解决问题。我能依据您的愿望构建应用及改造系统，为您打造专属的数字世界。',
    desc_3: '未来不会流于无形—— 未来，留于物形。',
    next: '下一步',
    prev: '上一步',
    admin_title: '创建管理员',
    admin_hint: '请设置您的管理员账户以确保系统安全与权限管理。',
    username: '用户名',
    username_ph: '请输入用户名',
    password: '密码',
    password_ph: '设置密码',
    confirm: '确认密码',
    confirm_ph: '再次输入密码',
    creating: '创建中…',
    model_title: '连接大语言模型',
    model_hint: '配置您的 AI 核心引擎，支持多种供应商或自定义 API 接口。',
    provider: '供应商',
    model_label: '模型',
    api_url: 'API 链接 (可选)',
    api_key: 'API Key',
    auth_apikey: 'API Key',
    auth_oauth: 'OAuth 登录',
    oauth_hint: '通过 OpenAI 账号授权登录，无需手动填写 API Key。',
    oauth_login: '使用 OpenAI 账号登录',
    oauth_connecting: '连接中…',
    oauth_connected: '已通过 OAuth 连接 OpenAI',
    oauth_manual_hint: '或手动填写 Token',
    testing: '检查中…',
    save_test: '连接大模型',
    intro_title: '初始化完成',
    intro_hint: '系统已就绪，以下是来自 AI 核心的初次回应：',
    enter: '进入系统',
    installing_hint: '正在应用语言并编译前端，请稍候…',
    install_ready_hint: '系统已准备完成，可以进入系统。',
    install_failed_hint: '系统准备失败，请返回上一页重新检查。',
    enter_preparing: '准备中…',
    err_mismatch: '两次密码不一致',
    err_admin: '创建管理员失败',
    err_save: '模型配置保存失败',
    err_test: '模型连通测试失败',
    default_intro: '你好，我是 AIOS。很高兴认识你。',
    prompt_intro: '生成初始化欢迎介绍。',
    prompt_system: '你是 AIOS，一个 AI 驱动的个人操作系统。现在是初始化完成后的第一次启动，请做一段简短的自我介绍（3-5句），像第一次见面打招呼一样自然。告诉用户你能做什么、你的特点。',
    prompt_user: '你好，介绍一下你自己。',
  },
  en: {
    desc_1: 'Welcome to AIOS.',
    desc_2: 'I am dedicated to turning your ideas into real actions and solving problems efficiently. I can build apps and transform systems according to your desires, crafting your exclusive digital world.',
    desc_3: 'The future will not remain formless — the future takes physical shape.',
    next: 'Next',
    prev: 'Back',
    admin_title: 'Create Admin',
    admin_hint: 'Please set up your administrator account for system security.',
    username: 'Username',
    username_ph: 'Enter username',
    password: 'Password',
    password_ph: 'Set password',
    confirm: 'Confirm',
    confirm_ph: 'Enter again',
    creating: 'Creating…',
    model_title: 'Language Model',
    model_hint: 'Configure your AI core engine, supporting multiple providers.',
    provider: 'Provider',
    model_label: 'Model',
    api_url: 'API URL (Optional)',
    api_key: 'API Key',
    auth_apikey: 'API Key',
    auth_oauth: 'OAuth Login',
    oauth_hint: 'Sign in with your OpenAI account. No API key needed.',
    oauth_login: 'Sign in with OpenAI',
    oauth_connecting: 'Connecting…',
    oauth_connected: 'Connected to OpenAI via OAuth',
    oauth_manual_hint: 'Or enter tokens manually',
    testing: 'Checking…',
    save_test: 'Connect Model',
    intro_title: 'Initialization Complete',
    intro_hint: 'System is ready. Here is the first response from the AI core:',
    enter: 'Enter System',
    installing_hint: 'Applying language and rebuilding the frontend. Please wait…',
    install_ready_hint: 'The system is ready. You can enter now.',
    install_failed_hint: 'System preparation failed. Please go back and check again.',
    enter_preparing: 'Preparing…',
    err_mismatch: 'Passwords do not match',
    err_admin: 'Failed to create admin',
    err_save: 'Failed to save model config',
    err_test: 'Model connection test failed',
    default_intro: 'Hi, I am AIOS. Nice to meet you.',
    prompt_intro: 'Generate onboarding intro.',
    prompt_system: 'You are AIOS, an AI-driven personal operating system. This is the first boot after initialization. Give a brief self-introduction (3-5 sentences), naturally like greeting someone for the first time. Tell the user what you can do.',
    prompt_user: 'Hello, introduce yourself.',
  }
};

const step = ref(1);
const pending = ref(false);
const error = ref('');
const welcomeText = ref('');
const displayedText = ref('');
const typing = ref(false);
const installing = ref(false);
const installReady = ref(false);
let typeTimer = null;

const detectedLanguage = String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';

const admin = ref({ username: '', password: '', confirm: '' });

const model = ref({
  provider: 'openai',
  apiUrl: getProvider('openai')?.apiUrl || '',
  model: getProvider('openai')?.defaultModel || '',
  apiKey: '',
  accessToken: '',
  refreshToken: '',
  authMethod: 'apikey',
  language: detectedLanguage
});

const oauthConnected = ref(false);

const currentProviderSupportsOAuth = computed(() => {
  const p = getProvider(model.value.provider);
  return p?.supportsOAuth === true;
});

const t = computed(() => texts[model.value.language] || texts.en);
const installMessage = computed(() => {
  if (error.value && !pending.value && !installing.value && !installReady.value && step.value === 4) {
    return error.value || t.value.install_failed_hint;
  }
  if (installing.value) return t.value.installing_hint;
  if (installReady.value) return t.value.install_ready_hint;
  return t.value.installing_hint;
});
const enterButtonLabel = computed(() => (installing.value || !installReady.value ? t.value.enter_preparing : t.value.enter));

const applyProviderDefault = () => {
  const item = getProvider(model.value.provider);
  model.value.apiUrl = item?.apiUrl || '';
  model.value.model = item?.defaultModel || '';
  model.value.authMethod = 'apikey';
  model.value.accessToken = '';
  model.value.refreshToken = '';
  oauthConnected.value = false;
};

const hasBootstrapModel = (settings) => {
  return Boolean(settings?.provider && settings?.apiUrl && settings?.apiKey && settings?.model);
};

const loadSettings = async () => {
  const res = await fetch('/aios/api/settings', {
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok || data?.success === false || data?.error) {
    throw new Error(data?.message || data?.error || t.value.err_save);
  }
  return data?.data || data || {};
};

const showWelcome = (intro) => {
  step.value = 4;
  welcomeText.value = intro || t.value.default_intro;
  startTypewriter(welcomeText.value);
  prepareSystem().catch((e) => {
    error.value = e instanceof Error ? e.message : '安装完成失败';
    installing.value = false;
    installReady.value = false;
  });
};

const generateIntro = async () => {
  const testRes = await fetch('/aios/api/task/create/instant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      app: 'setup',
      title: t.value.prompt_intro,
      prompt: t.value.prompt_intro,
      schema: { required: ['intro'] },
      messages: [
        { role: 'system', content: '只输出 JSON：{"intro":"..."}' },
        { role: 'system', content: t.value.prompt_system },
        { role: 'user', content: t.value.prompt_user }
      ]
    })
  });
  const testData = await testRes.json();
  if (!testRes.ok || testData?.success === false) {
    throw new Error(testData?.message || t.value.err_test);
  }
  const parsed = JSON.parse(String(testData.response || '{}'));
  return parsed?.intro || t.value.default_intro;
};

const enterWelcome = async () => {
  const intro = await generateIntro();
  showWelcome(intro);
};

const createAdmin = async () => {
  error.value = '';
  if (admin.value.password !== admin.value.confirm) {
    error.value = t.value.err_mismatch;
    return;
  }
  pending.value = true;
  try {
    const res = await fetch('/aios/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: admin.value.username, password: admin.value.password })
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.message || t.value.err_admin);
    clearAuthCache();
    const settings = await loadSettings();
    if (hasBootstrapModel(settings)) {
      model.value.provider = settings.provider;
      model.value.apiUrl = settings.apiUrl;
      model.value.apiKey = settings.apiKey;
      model.value.model = settings.model;
      await enterWelcome();
      return;
    }
    step.value = 3;
  } catch (e) {
    error.value = e?.message || t.value.err_admin;
  } finally {
    pending.value = false;
  }
};

const startTypewriter = (text) => {
  if (typeTimer) clearInterval(typeTimer);
  welcomeText.value = text;
  displayedText.value = '';
  typing.value = true;
  let i = 0;
  typeTimer = setInterval(() => {
    if (i < text.length) {
      displayedText.value = text.slice(0, ++i);
    } else {
      clearInterval(typeTimer);
      typing.value = false;
    }
  }, 50);
};

const prepareSystem = async () => {
  installing.value = true;
  installReady.value = false;
  error.value = '';
  const res = await fetch('/aios/api/system/install/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ language: model.value.language })
  });
  const data = await res.json();
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || '安装完成失败');
  }
  installReady.value = true;
  installing.value = false;
};

const saveModelAndTest = async () => {
  error.value = '';
  pending.value = true;
  installReady.value = false;
  try {
    const saveRes = await fetch('/aios/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        provider: model.value.provider,
        apiUrl: model.value.apiUrl,
        apiKey: model.value.apiKey,
        model: model.value.model
      })
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok || saveData?.success === false || saveData?.error) {
      throw new Error(saveData?.message || saveData?.error || t.value.err_save);
    }
    await enterWelcome();
  } catch (e) {
    error.value = e?.message || t.value.err_test;
  } finally {
    pending.value = false;
  }
};

const startOAuthLogin = async () => {
  error.value = '';
  pending.value = true;
  try {
    // 1. Ask server to start OAuth flow (creates temp server on port 1455)
    const res = await fetch('/aios/api/auth/openai/authorize', {
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to start OAuth');

    // 2. Open OpenAI login page in a new tab
    window.open(data.authorizationUrl, '_blank');

    // 3. Poll server until the callback is received
    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch('/aios/api/auth/openai/poll', {
          method: 'POST',
          credentials: 'include'
        });
        const pollData = await pollRes.json();

        if (pollData.status === 'pending') return; // still waiting

        clearInterval(pollInterval);

        if (pollData.status === 'complete') {
          oauthConnected.value = true;
          pending.value = false;
        } else {
          error.value = pollData.message || 'OAuth failed';
          pending.value = false;
        }
      } catch {
        clearInterval(pollInterval);
        error.value = 'OAuth polling failed';
        pending.value = false;
      }
    }, 1500);
  } catch (e) {
    error.value = e?.message || 'OAuth login failed';
    pending.value = false;
  }
};

const saveOAuthAndTest = async () => {
  error.value = '';
  pending.value = true;
  try {
    // If user manually filled in tokens, use manual-tokens endpoint
    if (model.value.accessToken) {
      const tokenRes = await fetch('/aios/api/auth/openai/manual-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: model.value.accessToken,
          refreshToken: model.value.refreshToken || undefined
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData?.success === false) {
        throw new Error(tokenData?.message || t.value.err_save);
      }
    }
    // Save the model name
    const saveRes = await fetch('/aios/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        model: model.value.model
      })
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok || saveData?.success === false) {
      throw new Error(saveData?.message || t.value.err_save);
    }
    await enterWelcome();
  } catch (e) {
    error.value = e?.message || t.value.err_test;
  } finally {
    pending.value = false;
  }
};

const enterSystem = async () => {
  if (!installReady.value || installing.value) return;
  clearAuthCache();
  window.location.href = '/aios/';
};

onUnmounted(() => {
  if (typeTimer) clearInterval(typeTimer);
});
</script>

<style scoped>
.wiz-input {
  width: 100%;
  border-radius: 6px;
  border: 1px solid transparent;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  font-size: 13px;
  color: #e8d4b8;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.wiz-input::placeholder {
  color: #5a4a35;
}

.wiz-input:focus {
  border-color: #c8a060;
  background: rgba(0, 0, 0, 0.5);
}

.wiz-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a7860'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
}
</style>
