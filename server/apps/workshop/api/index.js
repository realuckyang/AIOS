import { json } from "../../../shared/http/json.js";
import { readBody } from "../../../shared/http/readBody.js";
import { listIdeas } from "../repository/ideas.js";
import {
    createProject, listAllProjects, getProjectDetail,
    regeneratePlan, removeProject, getResult,
} from "../service/projects.js";

const handleWorkshopApi = async (req, res, path) => {
    if (path === "/apps/workshop/ideas" && req.method === "GET") {
        json(res, { success: true, items: listIdeas() });
        return true;
    }
    if (path === "/apps/workshop/project/list" && req.method === "GET") {
        json(res, { items: listAllProjects() });
        return true;
    }
    if (path === "/apps/workshop/project/get" && req.method === "GET") {
        const url = new URL(req.url, "http://x");
        const id = Number(url.searchParams.get("id"));
        const detail = getProjectDetail(id);
        if (!detail) { json(res, { error: "not found" }, 404); return true; }
        json(res, detail);
        return true;
    }
    if (path === "/apps/workshop/project/create" && req.method === "POST") {
        const body = await readBody(req);
        const result = await createProject(body);
        if (result?.error) { json(res, { error: result.error }, result.status || 400); return true; }
        json(res, result);
        return true;
    }
    if (path === "/apps/workshop/project/delete" && req.method === "POST") {
        const body = await readBody(req);
        const result = removeProject(body);
        if (result?.error) { json(res, { error: result.error }, result.status || 400); return true; }
        json(res, result);
        return true;
    }
    if (path === "/apps/workshop/plan/regenerate" && req.method === "POST") {
        const body = await readBody(req);
        const result = regeneratePlan(body);
        if (result?.error) { json(res, { error: result.error }, result.status || 400); return true; }
        json(res, result);
        return true;
    }
    if (path === "/apps/workshop/result/get" && req.method === "GET") {
        const url = new URL(req.url, "http://x");
        const planId = url.searchParams.get("planId");
        const taskId = url.searchParams.get("taskId");
        const result = getResult({ planId, taskId });
        if (!result) { json(res, { error: "not found" }, 404); return true; }
        json(res, result);
        return true;
    }
    return false;
};

export {
    handleWorkshopApi
};
