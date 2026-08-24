import { updateSessionEnd } from '../repository/session.js';
import { incrementWinCount } from '../repository/parties.js';
import { instantTaskJson } from '../../app_shared/instantTask.js';

export const finishDebate = async (body = {}, req) => {
  const debateId = String(body.debateId || '').trim();
  const candidateParty = String(body.candidateParty || '').trim();
  const candidateName = String(body.candidateName || '').trim();
  const supportRate = Number(body.supportRate || 0);
  const policy = String(body.policy || '').trim();
  const candidateSupportRate = Number(body.candidateSupportRate || 0);
  const opponentSupportRate = Number(body.opponentSupportRate || 0);
  const endTime = String(body.endTime || new Date().toISOString());

  if (!debateId || !candidateName || !candidateParty) {
    return { status: 400, message: '参数不完整' };
  }

  updateSessionEnd({ debateId, candidateSupportRate, opponentSupportRate, endTime });

  const messages = [{ role: 'system', content: '你扮演美国总统辩论主持人。' }];
  if (supportRate > 50) {
    incrementWinCount(candidateParty);
    messages.push({
      role: 'user',
      content: `当前候选人：${candidateName}
候选人政策主张：${policy}
候选人竞选成功，请基于其主张生成一份总统就职演讲。`
    });
  } else {
    messages.push({
      role: 'user',
      content: `当前候选人：${candidateName}
候选人政策主张：${policy}
候选人落败，请结合以上情况分析失败原因。`
    });
  }

  try {
    const data = await instantTaskJson({
      app: 'debate',
      title: '辩论结束陈述',
      prompt: '输出结束陈述内容。',
      schema: { required: ['content'] },
      messages: [
        ...messages,
        { role: 'system', content: '只输出 JSON：{"content":"..."}' }
      ],
      req
    });
    return { content: String(data.content || '').trim() };
  } catch (error) {
    return { status: 500, message: error.message || '结束辩论失败' };
  }
};
