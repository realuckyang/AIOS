import { db } from "./client.js";

const listIdeas = () => db.prepare(`
  SELECT id, title, category, summary, prompt, created_at, updated_at
  FROM workshop_ideas
  ORDER BY category ASC, title ASC
`).all();

const getIdea = (id) => db.prepare(`
  SELECT id, title, category, summary, prompt
  FROM workshop_ideas WHERE id = ?
`).get(id);

export {
  listIdeas,
  getIdea
};

