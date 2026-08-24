import { insertRecord } from '../repository/message.js';

export const saveRecord = (body = {}) => {
  const debateId = String(body.debateId || '').trim();
  const topicName = String(body.topicName || '').trim();
  const speakerRole = String(body.speakerRole || '').trim();
  const speakerName = String(body.speakerName || '').trim();
  const content = String(body.content || '');
  const draft = String(body.draft || '');

  if (!debateId || !topicName || !speakerRole || !speakerName) {
    return { status: 400, message: '参数不完整' };
  }

  const r = insertRecord({ debateId, topicName, speakerRole, speakerName, content, draft });
  return { success: true, id: r.lastInsertRowid };
};
