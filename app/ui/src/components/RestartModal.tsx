import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { RestartRequest } from '../types';
import { chatRoute, setHashSilently } from '../router';

type Phase = 'pending' | 'restarting' | 'repairing' | 'failed';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 重启成功、reload 之前把 URL 指回申请里指定的对话(如果给了),保证重启后能回到原对话。 */
function jumpToTarget(request: RestartRequest | null) {
  if (request?.target_chat) setHashSilently(chatRoute(request.target_chat));
}

async function waitForNewApp(previousId: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const health = await fetch('/api/health', { cache: 'no-store' }).then((res) => res.ok ? res.json() : null);
      if (health?.ok && health.instanceId !== previousId) return true;
    } catch { /* App 重启期间断线是预期状态 */ }
    await delay(500);
  }
  return false;
}

async function runRepair(kernelPort: number, appPort: number, request: RestartRequest, onText: (text: string) => void) {
  const runId = `repair-${crypto.randomUUID()}`;
  const prompt = [
    'App 在用户确认重启后未能恢复健康。',
    `重启原因: ${request.summary}`,
    request.reason ? `详情: ${request.reason}` : '',
    '请检查 App 启动日志和当前代码，修复问题并完成必要验证。',
    '修复代码后等待 Boot 自动重新拉起 App；不要自行管理 App 进程或向 Boot 发信号。',
    `检查 http://127.0.0.1:${appPort}/api/health，确认 App 恢复后再结束。`,
  ].filter(Boolean).join('\n');
  const res = await fetch(`http://127.0.0.1:${kernelPort}/api/runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      runId,
      input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      state: {},
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const decoder = new TextDecoder();
  let buffer = '';
  const reader = res.body!.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = value;
    buffer += decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const event = block.match(/^event:\s*(.+)$/m)?.[1];
      const raw = block.match(/^data:\s*(.+)$/m)?.[1];
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if ((event === 'message' || event === 'reasoning') && data.delta) onText(data.delta);
        if (event === 'error') throw new Error(data.message || 'Kernel 自愈失败');
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }
}

export function RestartModal() {
  const [request, setRequest] = useState<RestartRequest | null>(null);
  const [phase, setPhase] = useState<Phase>('pending');
  const [detail, setDetail] = useState('');
  const baselineId = useRef('');
  const kernelPort = useRef(9522);
  const appPort = useRef(9523);

  useEffect(() => {
    Promise.all([api.getHealth(), api.getConfig(), api.getPendingRestart()]).then(([health, config, pending]) => {
      baselineId.current = health.instanceId;
      kernelPort.current = config.kernelPort;
      appPort.current = config.appPort;
      if (pending) setRequest(pending);
    }).catch(() => {});
    const source = new EventSource('/api/events');
    source.addEventListener('restart_requested', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setRequest(data.request);
        setPhase('pending');
        setDetail('');
      } catch { /* 忽略非法事件 */ }
    });
    source.addEventListener('restart_cancelled', () => setRequest(null));
    return () => source.close();
  }, []);

  const repair = async (current: RestartRequest) => {
    setPhase('repairing');
    setDetail('App 未恢复，正在请求 Kernel 自愈…');
    const oldId = baselineId.current;
    const healthWatch = waitForNewApp(oldId, 120_000);
    try {
      await Promise.race([
        healthWatch.then((ok) => { if (ok) { jumpToTarget(request); location.reload(); } }),
        runRepair(kernelPort.current, appPort.current, current, (text) => setDetail((value) => (value + text).slice(-2000))),
      ]);
      if (await waitForNewApp(oldId, 15_000)) {
        jumpToTarget(request);
        location.reload();
      }
      else {
        setPhase('failed');
        setDetail((value) => `${value}\n自愈未能恢复 App，可重试。`);
      }
    } catch (error) {
      setPhase('failed');
      setDetail((error as Error).message);
    }
  };

  const confirm = async () => {
    if (!request) return;
    setPhase('restarting');
    setDetail('正在等待 App 重启…');
    try {
      baselineId.current = (await api.getHealth()).instanceId;
      const current = await api.confirmRestart(request.id);
      if (await waitForNewApp(baselineId.current, 15_000)) {
        jumpToTarget(request);
        location.reload();
      }
      else await repair(current);
    } catch (error) {
      setPhase('failed');
      setDetail((error as Error).message);
    }
  };

  const cancel = async () => {
    if (!request) return;
    try { await api.cancelRestart(request.id); setRequest(null); } catch (error) { setDetail((error as Error).message); }
  };

  if (!request) return null;
  return (
    <div className="modal-mask" role="dialog" aria-modal="true" aria-labelledby="restart-title">
      <div className="modal">
        <h2 className="modal-title" id="restart-title">{phase === 'pending' ? '需要重启 App' : phase === 'restarting' ? '正在重启' : phase === 'repairing' ? 'AI 正在自愈' : '重启失败'}</h2>
        <p className="restart-summary">{request.summary}</p>
        {request.reason && <p className="restart-reason">{request.reason}</p>}
        {detail && <pre className="restart-detail">{detail}</pre>}
        <div className="modal-foot">
          {phase === 'pending' && <><button className="btn btn-plain" onClick={cancel}>取消</button><button className="btn btn-primary" onClick={confirm}>确认重启</button></>}
          {phase === 'failed' && <button className="btn btn-primary" onClick={() => repair(request)}>重试自愈</button>}
        </div>
      </div>
    </div>
  );
}
