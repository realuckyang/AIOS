import { listDecisions as listDecisionsRepo } from "../repository/decisions.js";
const listDecisionRecords = ({ limit = 50 } = {}) => {
  const items = listDecisionsRepo(limit);
  return { success: true, items };
};
export {
  listDecisionRecords
};
