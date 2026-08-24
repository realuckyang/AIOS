import { getLatestSession } from '../repository/session.js';
import { getSupportRateByParty } from '../repository/parties.js';
import { getRecordsByDebateId } from '../repository/message.js';

export const getLatest = () => {
  const session = getLatestSession();
  if (!session) return { success: true, session: null, topics: [], currentTopic: 1 };

  const candidateParty = getSupportRateByParty(session.candidateParty);
  const opponentParty = getSupportRateByParty(session.opponentParty);
  const records = getRecordsByDebateId(session.debateId);

  const topicMap = new Map();
  const topics = [];
  for (const rec of records) {
    const key = String(rec.topicName || '').trim() || '未命名议题';
    if (!topicMap.has(key)) {
      const topic = {
        topicName: key,
        messages: [],
        status: true,
        candidateSupportRate: Number(candidateParty?.supportRate || 0),
        opponentSupportRate: Number(opponentParty?.supportRate || 0),
        candidatePolicy: ''
      };
      topicMap.set(key, topic);
      topics.push(topic);
    }
    topicMap.get(key).messages.push({
      role: rec.speakerRole,
      name: rec.speakerName,
      content: rec.content || ''
    });
  }

  const currentTopic = Math.max(1, topics.length || 1);
  return {
    success: true,
    session,
    topics,
    currentTopic,
    sessionEnded: Boolean(session.endTime)
  };
};
