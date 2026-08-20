// 入口:解析命令行 → 帮助 / headless / 交互界面。
process.removeAllListeners('warning'); // node:sqlite 的实验性告警会盖住界面
import { HELP, loadConfig, parseCli } from './config.js';
import { AppClient } from './app-client.js';
import { KernelClient } from './kernel-client.js';
import type { Client } from './protocol.js';

async function main(): Promise<number> {
  const cli = parseCli(process.argv.slice(2));
  if (cli.mode === 'help') { process.stdout.write(HELP); return 0; }
  if (cli.mode === 'error') { process.stderr.write(`${cli.message}\n`); return 2; }

  const config = await loadConfig(cli.direct);
  if (config.direct && !cli.direct) process.stderr.write('· App 没应答,直连 Kernel(无历史、无压缩)\n');

  const client: Client = config.direct ? new KernelClient(config) : new AppClient(config, cli.chat);
  await client.open();

  if (cli.mode === 'run') return runOnce(client, cli.prompt);

  const initial = await client.history().catch(() => []);
  const { renderApp } = await import('./ui/render.js');
  await renderApp({ client, config, initial });
  client.close();
  return 0;
}

async function runOnce(client: Client, prompt: string): Promise<number> {
  const { runHeadless } = await import('./run.js');
  return runHeadless(client, prompt);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => { process.stderr.write(`\n✗ ${err?.message ?? err}\n`); process.exit(1); });
