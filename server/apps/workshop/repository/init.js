import { db } from "./client.js";

const seedIdeas = [
  {
    id: "server-panel",
    title: "服务器面板",
    category: "ops",
    summary: "生成一个远程服务器状态、进程、磁盘和日志的管理面板 demo。",
    prompt: "生成一个服务器管理面板 demo。需要包含 CPU/内存/磁盘状态、进程列表、日志流、服务启停按钮和告警区域。界面要适合远程场景和服务器面板场景，信息密度高，像真实可用的操作台。"
  },
  {
    id: "remote-workspace",
    title: "远程工作台",
    category: "remote",
    summary: "生成一个远程桌面/终端/文件/任务组合工作台 demo。",
    prompt: "生成一个远程工作台 demo。需要包含左侧资源树、中间终端和文件预览、右侧任务记录与 AI 建议。整体用于远程操作另一台机器，强调低延迟、状态清晰和可恢复的操作流。"
  },
  {
    id: "ai-runbook",
    title: "AI 运维 Runbook",
    category: "ops",
    summary: "生成一个把故障排查步骤、命令和结果组织起来的 runbook demo。",
    prompt: "生成一个 AI 运维 Runbook demo。需要展示故障摘要、排查步骤、可执行命令、命令结果、风险提示和回滚方案。交互上要像一个可以边执行边记录的运维剧本。"
  },
  {
    id: "app-builder",
    title: "应用生成器",
    category: "builder",
    summary: "生成一个从想法到 demo 的应用生成器界面。",
    prompt: "生成一个应用生成器 demo。需要包含灵感输入、需求拆解、页面结构、数据模型、生成进度、预览区域和重新生成按钮。目标是把一个应用想法快速变成可看的 demo。"
  },
  {
    id: "personal-os",
    title: "个人 AI OS",
    category: "os",
    summary: "生成一个以对话、任务、文件、应用为核心的个人 AI 操作系统 demo。",
    prompt: "生成一个个人 AI OS demo。需要包含对话、任务、文件、应用入口、系统状态和设置。重点体现 AI 不是聊天窗口，而是可以调度工具、管理状态、沉淀结果的操作系统。"
  }
];

const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workshop_ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      summary TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workshop_projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      topic       TEXT    NOT NULL,
      idea_id     TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workshop_plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL,
      slug        TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES workshop_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workshop_tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id     INTEGER NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'pending',
      attempt     INTEGER NOT NULL DEFAULT 1,
      error       TEXT,
      started_at  TEXT,
      finished_at TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES workshop_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workshop_results (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id     INTEGER NOT NULL,
      html        TEXT    NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES workshop_tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workshop_plans_project ON workshop_plans(project_id);
    CREATE INDEX IF NOT EXISTS idx_workshop_tasks_plan    ON workshop_tasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_workshop_tasks_status  ON workshop_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_workshop_results_task  ON workshop_results(task_id);
  `);
  db.pragma("foreign_keys = ON");

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO workshop_ideas (id, title, category, summary, prompt)
    VALUES (@id, @title, @category, @summary, @prompt)
  `);
  const tx = db.transaction((items) => {
    for (const item of items) stmt.run(item);
  });
  tx(seedIdeas);
};

export {
  initDatabase
};
