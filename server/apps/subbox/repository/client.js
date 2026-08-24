import { createAppDb } from "../../app_shared/db/createAppDb.js";

const db = createAppDb("subbox.db");
const nowIso = () => new Date().toISOString();

const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const hhmmLocal = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export { db, nowIso, todayLocal, hhmmLocal };
