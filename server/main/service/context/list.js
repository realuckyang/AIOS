import { listContexts } from "../../repository/context.js";

const listContextItems = ({ includeNone = true, limit = 200 } = {}) => {
  return {
    items: listContexts({ includeNone, limit }).map((row) => ({
      id: row.id,
      source: row.source,
      sourceId: row.source_id,
      title: row.title,
      summary: row.summary,
      content: row.content,
      access: row.access,
      updatedAt: row.updated_at
    }))
  };
};

export {
  listContextItems
};
