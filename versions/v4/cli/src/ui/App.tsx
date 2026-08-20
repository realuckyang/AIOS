// 交互界面:上面是流式转录,底部一行输入 + 状态。
// 思考灰、正文常规、工具青、结果缩进灰、系统与错误黄红。
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useEffect, useRef, useState } from 'react';

import { Markdown } from './markdown.js';
import type { Client, Row, Totals } from '../protocol.js';
import type { Config } from '../config.js';

type Props = { client: Client; config: Config; initial: Row[] };

const clip = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max)}…` : text);
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** 运行中的一行:转圈 + 在干什么 + 跑了多久。只在 busy 时挂载,空闲时没有定时器。 */
function Working({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const spin = setInterval(() => setFrame((n) => n + 1), 100);
    const clock = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => { clearInterval(spin); clearInterval(clock); };
  }, []);
  return (
    <Box marginTop={1}>
      <Text color="magenta">{FRAMES[frame % FRAMES.length]} </Text>
      <Text>{label}</Text>
      <Text dimColor>{seconds ? ` ${seconds}s` : ''} · Esc 停</Text>
    </Box>
  );
}

export function App({ client, config, initial }: Props) {
  const { exit } = useApp();
  const [rows, setRows] = useState<Row[]>(initial);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);   // 水位:最近一次请求的 in+out
  const [totals, setTotals] = useState<Totals>({ input: 0, cached: 0, output: 0 }); // 整段累计
  const [chatId, setChatId] = useState(client.chatId);
  const open = useRef(false); // 当前是否有一条正在流的 assistant 行

  const push = (row: Row) => setRows((prev) => [...prev, row]);
  const note = (text: string, tone: 'info' | 'warn' | 'error' = 'info') => {
    open.current = false;
    push({ kind: 'system', text, tone });
  };

  const streamInto = (patch: (row: Extract<Row, { kind: 'assistant' }>) => void) =>
    setRows((prev) => {
      const copy = prev.slice();
      const last = copy[copy.length - 1];
      if (open.current && last?.kind === 'assistant') {
        const next = { ...last };
        patch(next);
        copy[copy.length - 1] = next;
      } else {
        open.current = true;
        const fresh = { kind: 'assistant', text: '', reasoning: '' } as Extract<Row, { kind: 'assistant' }>;
        patch(fresh);
        copy.push(fresh);
      }
      return copy;
    });

  useEffect(() => {
    client.on('status', (running) => { if (!running) open.current = false; setBusy(running); });
    client.on('reasoning', (delta) => streamInto((row) => { row.reasoning += delta; }));
    client.on('message', (delta) => streamInto((row) => { row.text += delta; }));
    client.on('tool', (call) => { open.current = false; push({ kind: 'tool', ...call, done: false }); });
    client.on('tool-result', ({ callId, text }) => setRows((prev) => {
      const copy = prev.slice();
      for (let i = copy.length - 1; i >= 0; i--) {
        const row = copy[i];
        if (row.kind === 'tool' && ((callId && row.callId === callId) || (!callId && !row.done))) {
          copy[i] = { ...row, result: text, done: true };
          break;
        }
      }
      return copy;
    }));
    client.on('usage', (usage) => {
      setLevel((Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0));
    });
    client.on('totals', setTotals);
    client.on('note', (text) => note(text, 'warn'));
    client.on('error', (message) => { setBusy(false); note(message, 'error'); });
  }, [client]);

  // Esc / Ctrl-C:运行中先停,不忙才退
  useInput((_ch, key) => {
    if (key.escape || (key.ctrl && _ch === 'c')) {
      if (busy) { void client.stop(); note('已请求停止', 'warn'); }
      else { client.close(); exit(); }
    }
  });

  const command = async (text: string) => {
    const [name] = text.slice(1).split(/\s+/);
    switch (name) {
      case 'new':
        await client.reset();
        setChatId(client.chatId);
        setRows([]);
        setLevel(0);
        setTotals({ input: 0, cached: 0, output: 0 });
        note(`新对话 ${client.chatId}`);
        break;
      case 'clear': setRows([]); break;
      case 'id': note(`对话 ${client.chatId} · ${client.label}`); break;
      case 'model': note(`模型 ${config.model || '(未设置)'} · 窗口 ${compact(config.contextWindow)}`); break;
      case 'help': note('/new 新对话 · /clear 清屏 · /id 看对话 · /model 看模型 · /quit 退出 · Esc 停或退'); break;
      case 'quit': case 'exit': case 'q': client.close(); exit(); break;
      default: note(`未知命令 /${name}(/help 看全部)`, 'warn');
    }
  };

  const submit = (value: string) => {
    const text = value.trim();
    setInput('');
    if (!text) return;
    if (text.startsWith('/')) { void command(text); return; }
    if (busy) { note('还在跑,先 Esc 停下再发。', 'warn'); return; }
    push({ kind: 'user', text });
    setBusy(true);
    void client.send(text).catch((err: Error) => { setBusy(false); note(err.message, 'error'); });
  };

  const pct = config.contextWindow > 0 ? Math.round((level / config.contextWindow) * 100) : 0;
  const pending = [...rows].reverse().find((row) => row.kind === 'tool' && !row.done) as Extract<Row, { kind: 'tool' }> | undefined;
  const working = pending ? `${pending.name}${pending.args ? ` · ${pending.args}` : ''}` : '思考中';
  const spent = totals.input + totals.output;

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text color="magenta">◆ aios</Text>
        <Text dimColor>{client.label} · {config.model || '未设置模型'} · {chatId}</Text>
      </Box>

      {rows.map((row, index) => <RowView key={index} row={row} />)}

      {busy ? <Working label={working} /> : null}

      <Box marginTop={busy || rows.length ? 1 : 0}>
        <Text color={busy ? 'gray' : 'magenta'}>❯ </Text>
        <TextInput value={input} onChange={setInput} onSubmit={submit}
          placeholder={busy ? '' : '说一句,或 /help'} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {busy ? '● 运行中' : '○ 空闲'}
          {level ? ` · 上下文 ${compact(level)}/${compact(config.contextWindow)} (${pct}%)` : ''}
          {config.direct ? ' · 直连内核,无历史' : ''}
        </Text>
        {spent ? (
          <Text dimColor>
            输入 {compact(totals.input)}
            {totals.cached ? <Text> 缓存 {compact(totals.cached)}</Text> : null}
            {' '}输出 {compact(totals.output)}
            {' '}· 合计 {compact(spent)}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

function RowView({ row }: { row: Row }) {
  if (row.kind === 'user') {
    return <Box marginTop={1}><Text color="magenta">❯ </Text><Text>{row.text}</Text></Box>;
  }
  if (row.kind === 'assistant') {
    return (
      <Box flexDirection="column" marginTop={1}>
        {row.reasoning ? <Text dimColor>{row.reasoning}</Text> : null}
        {row.text ? <Markdown text={row.text} /> : null}
      </Box>
    );
  }
  if (row.kind === 'tool') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">⚙ {row.name}
          {row.args ? <Text dimColor> · {clip(row.args, 120)}</Text> : null}
          {row.done ? '' : <Text dimColor> …</Text>}
        </Text>
        {row.result ? <Text dimColor>  ↳ {clip(row.result.replace(/\s+/g, ' '))}</Text> : null}
      </Box>
    );
  }
  const color = row.tone === 'error' ? 'red' : row.tone === 'warn' ? 'yellow' : 'gray';
  return <Box marginTop={1}><Text color={color}>{row.tone === 'error' ? '✗ ' : '· '}{row.text}</Text></Box>;
}
