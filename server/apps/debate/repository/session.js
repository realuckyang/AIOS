import { db } from './client.js';

export const upsertSession = ({ debateId, candidateName, candidateParty, opponentName, opponentParty }) => {
  db.prepare(`
    INSERT OR REPLACE INTO apps_debate_sessions (
      debate_id, candidate_name, candidate_party, opponent_name, opponent_party
    ) VALUES (?, ?, ?, ?, ?)
  `).run(debateId, candidateName, candidateParty, opponentName, opponentParty);
};

export const updateSessionEnd = ({ debateId, candidateSupportRate, opponentSupportRate, endTime }) => {
  db.prepare(`
    UPDATE apps_debate_sessions
    SET candidate_support_rate = ?, opponent_support_rate = ?, end_time = ?
    WHERE debate_id = ?
  `).run(candidateSupportRate, opponentSupportRate, endTime, debateId);
};

export const getLatestSession = () => {
  return db.prepare(`
    SELECT
      debate_id AS debateId,
      candidate_name AS candidateName,
      candidate_party AS candidateParty,
      opponent_name AS opponentName,
      opponent_party AS opponentParty,
      candidate_support_rate AS candidateSupportRate,
      opponent_support_rate AS opponentSupportRate,
      start_time AS startTime,
      end_time AS endTime,
      created_at AS createdAt
    FROM apps_debate_sessions
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 1
  `).get();
};
