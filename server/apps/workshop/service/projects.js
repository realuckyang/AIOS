import { instantTask } from "../../app_shared/instantTask.js";
import {
    insertProject, listProjects, getProject, deleteProject,
    insertPlan, listPlansForProject, getPlan,
    insertTask, updateTaskStatus, listTasksForProject, getLatestTaskForPlan, getTask,
    insertResult, getLatestResultForPlan, getResultByTaskId,
} from "../repository/projects.js";
import { getIdea } from "../repository/ideas.js";

// 平衡括号解析,容忍 ``` 围栏和前后说明,支持对象 / 数组
const extractJson = (raw) => {
    const text = String(raw || "").trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const src = (fenced ? fenced[1] : text).trim();
    const oI = src.indexOf("{");
    const aI = src.indexOf("[");
    if (oI === -1 && aI === -1) throw new Error("AI 响应里没找到 JSON");
    const start = (oI === -1 || (aI !== -1 && aI < oI)) ? aI : oI;
    let depth = 0, inStr = false, esc = false, end;
    for (let i = start; i < src.length; i++) {
        const c = src[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{" || c === "[") depth++;
        else if (c === "}" || c === "]") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end == null) throw new Error("AI 响应里 JSON 不完整");
    return JSON.parse(src.slice(start, end + 1));
};

const slugify = (raw, max = 60) => String(raw || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max) || "plan";

const planVariants = async ({ topic, count }) => {
    const prompt = [
        `请为主题「${topic}」生成 ${count} 个风格各异的 UI 设计方向用于做 HTML demo。`,
        "每个方向之间风格要鲜明区分,不要扎堆(避免都是 dark、都是极简、都是同一个色调)。",
        "字段:",
        "- slug: 英文短横线,2-3 词,简短,不重复(例如 minimal-cards / pastel-grid)",
        "- title: 「主题 · 风格名」格式,不超过 16 字",
        "- description: 一句话视觉关键词(配色 / 版式 / 形态),不超过 60 字",
        "",
        '严格只返回 JSON 对象,不要 ``` 不要任何解释或前后说明,格式如下:',
        '{"variants":[{"slug":"abc-xyz","title":"主题 · 风格","description":"…"}]}',
    ].join("\n");

    const r = await instantTask({
        app: "workshop",
        title: `规划 ${count} 个方向`,
        prompt,
        meta: { kind: "plan", topic },
    });
    const obj = extractJson(r?.response || "");
    const arr = Array.isArray(obj?.variants) ? obj.variants : (Array.isArray(obj) ? obj : null);
    if (!arr) throw new Error("AI 返回里没有 variants 数组");
    return arr.slice(0, count).filter(p => p && p.title);
};

const generateHtml = async ({ title, description }) => {
    const prompt = [
        "生成一个完整、可独立预览的 HTML demo 页面(单文件)。",
        "",
        "硬性要求:",
        "1) 完整结构:从 <!doctype html> 到 </html>。",
        "2) 单文件:CSS 全部写在 <style>,JS 全部写在 <script>,不引用外部 CSS / JS 文件。",
        "3) 不引入任何第三方 JS 库(jQuery / React / Vue 等都不要),用原生 JS。",
        "4) 鼓励原生 JS 让交互真的能动:tab 切换、按钮点击、加减数量、表单提交、模态等等,该响应就响应。",
        "5) 可以引入 Google Fonts 和 Material Symbols Outlined CDN。",
        "6) 内容要饱满 —— 假数据、列表、菜单、按钮、文案都要有,不要光骨架。",
        "7) 沙箱限制:no allow-same-origin,所以不能用 localStorage / cookies / parent 通信,JS 只在页面本地生效。",
        "",
        "设计语言要求:",
        "- 暖白底,圆角,柔软阴影,留白舒展",
        "- 低饱和色彩,主色仅用一个 accent",
        "- 不搞渐变(不要 radial-gradient / linear-gradient 当背景)",
        "- 不要技术化文案(产出 / 调用 / 工作中等词不要用)",
        "",
        `标题:${title}`,
        `设计方向:${description}`,
        "",
        "直接返回 HTML 源码本身,不要 ``` 不要解释。",
    ].join("\n");

    const result = await instantTask({
        app: "workshop",
        title: `生成 ${title}`,
        prompt,
        meta: { kind: "html", title },
    });
    let html = (result?.response || "").trim();
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    if (!html.toLowerCase().includes("<html")) throw new Error("AI 返回不是完整 HTML");
    return html;
};

// 后台执行单个任务:running → 生成 → done / failed
const runTask = async (taskId, plan) => {
    updateTaskStatus(taskId, "running");
    try {
        const html = await generateHtml({
            title: plan.title,
            description: plan.description || "",
        });
        insertResult({ taskId, html });
        updateTaskStatus(taskId, "done");
    } catch (err) {
        updateTaskStatus(taskId, "failed", { error: err.message || String(err) });
    }
};

// 创建项目:同步生成 plans,异步生成 html
// 支持可选 ideaId — 如果给了,从 workshop_ideas 拿 prompt 当 topic
const createProject = async (body = {}) => {
    let topic = String(body.topic || "").trim().slice(0, 200);
    const ideaId = body.ideaId ? String(body.ideaId) : null;
    if (!topic && ideaId) {
        const idea = getIdea(ideaId);
        if (idea) topic = idea.prompt || idea.summary || idea.title;
    }
    const count = Math.max(1, Math.min(6, Number(body.count) || 3));
    if (!topic) return { error: "请先描述主题", status: 400 };

    let variants;
    try {
        variants = await planVariants({ topic, count });
    } catch (err) {
        return { error: `规划失败:${err.message || err}`, status: 502 };
    }
    if (!variants.length) return { error: "AI 没有给出方向", status: 502 };

    const project = insertProject({ topic, ideaId });

    const plans = variants.map((v, i) => {
        const plan = insertPlan({
            projectId: project.id,
            slug: slugify(v.slug || v.title),
            title: String(v.title).slice(0, 120),
            description: String(v.description || "").slice(0, 400),
            sortOrder: i,
        });
        const task = insertTask({ planId: plan.id, attempt: 1 });
        // 后台执行,不等
        runTask(task.id, plan);
        return { ...plan, latestTask: task };
    });

    return { project, plans };
};

// 列表:每个项目带状态计数
const listAllProjects = () => {
    const projects = listProjects();
    return projects.map(p => {
        const tasks = listTasksForProject(p.id);
        const plans = listPlansForProject(p.id);
        const counts = { plans: plans.length, pending: 0, running: 0, done: 0, failed: 0 };
        // 每个 plan 用最新一次 task 算状态
        for (const plan of plans) {
            const t = getLatestTaskForPlan(plan.id);
            if (!t) { counts.pending++; continue; }
            if (counts[t.status] != null) counts[t.status]++;
        }
        return { ...p, counts };
    });
};

// 详情:项目 + plans(每个 plan 含最新 task + 是否有任意成功结果)
const getProjectDetail = (id) => {
    const project = getProject(id);
    if (!project) return null;
    const plans = listPlansForProject(project.id).map(plan => {
        const latestTask = getLatestTaskForPlan(plan.id);
        // 即使本次正在重新生成,只要历史上有过成功结果就允许查看
        const hasResult = !!getLatestResultForPlan(plan.id);
        return { ...plan, latestTask, hasResult };
    });
    return { project, plans };
};

const regeneratePlan = (body = {}) => {
    const planId = Number(body.planId);
    const plan = getPlan(planId);
    if (!plan) return { error: "plan 不存在", status: 404 };
    const prev = getLatestTaskForPlan(planId);
    const attempt = (prev?.attempt || 0) + 1;
    const task = insertTask({ planId, attempt });
    runTask(task.id, plan);
    return { task };
};

const removeProject = (body = {}) => {
    const id = Number(body.id);
    if (!id) return { error: "缺少 id", status: 400 };
    return { deleted: deleteProject(id) ? 1 : 0 };
};

// 取结果(给 plan 取最新成功的;给 task 取这一次的)
const getResult = ({ planId, taskId }) => {
    if (taskId) {
        const result = getResultByTaskId(Number(taskId));
        if (!result) return null;
        const task = getTask(result.taskId);
        const plan = task ? getPlan(task.planId) : null;
        return { ...result, plan, task };
    }
    if (planId) {
        const result = getLatestResultForPlan(Number(planId));
        if (!result) return null;
        const plan = getPlan(Number(planId));
        const task = getTask(result.taskId);
        return { ...result, plan, task };
    }
    return null;
};

export {
    createProject,
    listAllProjects,
    getProjectDetail,
    regeneratePlan,
    removeProject,
    getResult,
};
