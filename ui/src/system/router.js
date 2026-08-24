import { createRouter, createWebHistory } from "vue-router";
import AppShell from "../views/AppShell.vue";
import WelcomeView from "../views/WelcomeView.vue";
import LoginView from "../views/LoginView.vue";
import * as api from "../utils/api.js";

const routes = [
  { path: "/", redirect: "/app/chat" },
  { path: "/welcome", name: "welcome", component: WelcomeView, meta: { public: true, mode: "setup" } },
  { path: "/login", name: "login", component: LoginView, meta: { public: true } },
  { path: "/app/:id/:p1?/:p2?", component: AppShell },
  { path: "/:pathMatch(.*)*", redirect: "/" }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// === 鉴权守卫 ===
// 每次进入需鉴权路由前查一次 /api/auth/state.SQL 单行查询很便宜,
// 不做缓存避免登录/登出后状态滞后.
router.beforeEach(async (to) => {
  let s;
  try {
    s = await api.get("/api/auth/state");
  } catch {
    s = { configured: false, authenticated: false };
  }
  if (to.meta?.public) {
    if (s.authenticated) return { path: "/", replace: true };
    if (to.name === "login" && !s.configured) return { name: "welcome", replace: true };
    if (to.name === "welcome" && s.configured) return { name: "login", replace: true };
    return true;
  }
  if (!s.authenticated) return { name: s.configured ? "login" : "welcome", replace: true };
  return true;
});

// 任何 401 → 回到鉴权入口；守卫会根据是否已配置密码决定 /welcome 或 /login。
api.setOn401(() => {
  const currentName = router.currentRoute.value.name;
  if (currentName !== "login" && currentName !== "welcome") {
    router.replace({ path: "/" });
  }
});

export {
  router
};
