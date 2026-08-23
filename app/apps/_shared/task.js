// 应用调模型的唯一入口。应用不知道 responsesUrl,不知道 apiKey ——
// 只提交一个任务,由框架开线程、落消息、记账。于是「花了钱但没记账」这件事
// 在结构上不可能发生:没有第二条通往模型的路。
//
//   instantTask —— 一次性补全,同步等结果(压缩摘要就是它的第一个使用者)
//   agentTask   —— agent 循环,可 wait:false 异步跑
const BASE = () => `http://127.0.0.1:${process.env.APP_PORT || 9523}`;

async function submit(body) {
  let res;
  try {
    res = await fetch(`${BASE()}/api/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`task 服务不可达: ${err.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`);
  return data;
}

export function instantTask({ app, title = '', prompt, instructions = '', timeoutMs }) {
  return submit({ app, title, prompt, instructions, mode: 'instant', timeoutMs });
}

export function agentTask({ app, title = '', prompt, wait = true }) {
  return submit({ app, title, prompt, mode: 'agent', wait });
}
