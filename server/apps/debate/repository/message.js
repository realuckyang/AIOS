import { db } from './client.js';

export const insertRecord = ({ debateId, topicName, speakerRole, speakerName, content, draft }) => {
  return db.prepare(`
    INSERT INTO apps_debate_records (debate_id, topic_name, speaker_role, speaker_name, content, draft)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(debateId, topicName, speakerRole, speakerName, content, draft);
};

export const getRecordsByDebateId = (debateId) => {
  return db.prepare(`
    SELECT topic_name AS topicName, speaker_role AS speakerRole, speaker_name AS speakerName, content
    FROM apps_debate_records
    WHERE debate_id = ?
    ORDER BY id ASC
  `).all(debateId);
};
