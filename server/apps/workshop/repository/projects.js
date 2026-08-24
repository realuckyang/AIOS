import { db } from "./client.js";

const rowToProject = (r) => r && {
    id: r.id, topic: r.topic, ideaId: r.idea_id || null,
    createdAt: r.created_at, updatedAt: r.updated_at,
};
const rowToPlan = (r) => r && {
    id: r.id, projectId: r.project_id, slug: r.slug, title: r.title,
    description: r.description || "",
    sortOrder: r.sort_order, createdAt: r.created_at,
};
const rowToTask = (r) => r && {
    id: r.id, planId: r.plan_id, status: r.status, attempt: r.attempt,
    error: r.error || "", startedAt: r.started_at, finishedAt: r.finished_at,
    createdAt: r.created_at,
};
const rowToResult = (r) => r && {
    id: r.id, taskId: r.task_id, html: r.html, createdAt: r.created_at,
};

// projects
const insertProject = ({ topic, ideaId = null }) => {
    const info = db.prepare(
        "INSERT INTO workshop_projects (topic, idea_id) VALUES (?, ?)"
    ).run(topic, ideaId);
    return rowToProject(db.prepare("SELECT * FROM workshop_projects WHERE id = ?").get(info.lastInsertRowid));
};
const listProjects = () =>
    db.prepare("SELECT * FROM workshop_projects ORDER BY id DESC").all().map(rowToProject);
const getProject = (id) =>
    rowToProject(db.prepare("SELECT * FROM workshop_projects WHERE id = ?").get(id));
const deleteProject = (id) =>
    db.prepare("DELETE FROM workshop_projects WHERE id = ?").run(id).changes > 0;

// plans
const insertPlan = ({ projectId, slug, title, description = "", sortOrder = 0 }) => {
    const info = db.prepare(
        "INSERT INTO workshop_plans (project_id, slug, title, description, sort_order) VALUES (?, ?, ?, ?, ?)"
    ).run(projectId, slug, title, description, sortOrder);
    return rowToPlan(db.prepare("SELECT * FROM workshop_plans WHERE id = ?").get(info.lastInsertRowid));
};
const listPlansForProject = (projectId) =>
    db.prepare("SELECT * FROM workshop_plans WHERE project_id = ? ORDER BY sort_order, id").all(projectId).map(rowToPlan);
const getPlan = (id) =>
    rowToPlan(db.prepare("SELECT * FROM workshop_plans WHERE id = ?").get(id));

// tasks
const insertTask = ({ planId, attempt = 1 }) => {
    const info = db.prepare(
        "INSERT INTO workshop_tasks (plan_id, attempt) VALUES (?, ?)"
    ).run(planId, attempt);
    return rowToTask(db.prepare("SELECT * FROM workshop_tasks WHERE id = ?").get(info.lastInsertRowid));
};
const updateTaskStatus = (id, status, opts = {}) => {
    const fields = ["status = ?"];
    const values = [status];
    if (status === "running") fields.push("started_at = datetime('now')");
    if (status === "done" || status === "failed") fields.push("finished_at = datetime('now')");
    if (opts.error !== undefined) { fields.push("error = ?"); values.push(opts.error || ""); }
    values.push(id);
    db.prepare(`UPDATE workshop_tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return rowToTask(db.prepare("SELECT * FROM workshop_tasks WHERE id = ?").get(id));
};
const listTasksForProject = (projectId) =>
    db.prepare(
        "SELECT t.* FROM workshop_tasks t JOIN workshop_plans p ON t.plan_id = p.id WHERE p.project_id = ? ORDER BY t.id"
    ).all(projectId).map(rowToTask);
const getLatestTaskForPlan = (planId) =>
    rowToTask(db.prepare("SELECT * FROM workshop_tasks WHERE plan_id = ? ORDER BY id DESC LIMIT 1").get(planId));
const getTask = (id) => rowToTask(db.prepare("SELECT * FROM workshop_tasks WHERE id = ?").get(id));

// results
const insertResult = ({ taskId, html }) => {
    const info = db.prepare(
        "INSERT INTO workshop_results (task_id, html) VALUES (?, ?)"
    ).run(taskId, html);
    return rowToResult(db.prepare("SELECT * FROM workshop_results WHERE id = ?").get(info.lastInsertRowid));
};
const getLatestResultForPlan = (planId) =>
    rowToResult(db.prepare(`
        SELECT r.* FROM workshop_results r
        JOIN workshop_tasks t ON r.task_id = t.id
        WHERE t.plan_id = ? AND t.status = 'done'
        ORDER BY r.id DESC LIMIT 1
    `).get(planId));
const getResultByTaskId = (taskId) =>
    rowToResult(db.prepare("SELECT * FROM workshop_results WHERE task_id = ? ORDER BY id DESC LIMIT 1").get(taskId));

export {
    insertProject, listProjects, getProject, deleteProject,
    insertPlan, listPlansForProject, getPlan,
    insertTask, updateTaskStatus, listTasksForProject, getLatestTaskForPlan, getTask,
    insertResult, getLatestResultForPlan, getResultByTaskId,
};
