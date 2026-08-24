import { instantTaskJson } from '../../app_shared/instantTask.js';

export const getTopicSummary = async (body = {}, req) => {
  const topicInfo = String(body.topicInfo || '').trim();
  if (!topicInfo) return { status: 400, message: '缺少 topicInfo' };

  const messages = [{
    role: 'user',
    content: `这是辩论情况：${topicInfo}
请生成：
1) 媒体简报（尖锐风格）
2) 候选人核心主张（1-2句）
3) 最新支持率 poll（候选人与对手）

要求：
- 支持率必须根据辩论明显变化，通常至少 5 个百分点，表现特别突出可 10 个百分点
- 两者相加不能超过 100
- poll 第一个必须是候选人，第二个必须是对手
- vote 字段必须是数字

只返回 JSON：
{
  "summary":"...",
  "policy":"...",
  "poll":[{"name":"候选人","vote":数字},{"name":"对手","vote":数字}]
}`
  }];

  try {
    const parsed = await instantTaskJson({
      app: 'debate',
      title: '辩论议题总结',
      prompt: '生成总结、主张和支持率。',
      schema: { required: ['summary', 'policy', 'poll'] },
      messages,
      req
    });
    return {
      summary: String(parsed.summary || '').trim(),
      policy: String(parsed.policy || '').trim(),
      poll: Array.isArray(parsed.poll) ? parsed.poll.slice(0, 2).map((p) => ({
        name: String(p?.name || '').trim(),
        vote: Number(p?.vote || 0)
      })) : []
    };
  } catch (error) {
    return { status: 500, message: error.message || '议题总结失败' };
  }
};
