// headless:跑一次就退。正文走 stdout,过程走 stderr —— `aios run … > out.txt` 只拿正文。
import type { Client } from './protocol.js';

export function runHeadless(client: Client, prompt: string): Promise<number> {
  return new Promise((resolve) => {
    let failed = false;
    let idle = false;

    client.on('message', (delta) => process.stdout.write(delta));
    client.on('tool', (call) => process.stderr.write(`\n[${call.name}] ${call.args}\n`));
    client.on('error', (message) => { failed = true; process.stderr.write(`\n✗ ${message}\n`); });
    client.on('status', (busy) => {
      if (busy) { idle = false; return; }
      if (idle) return; // App 空闲事件可能先于本轮到达
      idle = true;
      process.stdout.write('\n');
      client.close();
      resolve(failed ? 1 : 0);
    });

    client.send(prompt).catch((err: Error) => {
      process.stderr.write(`\n✗ ${err.message}\n`);
      client.close();
      resolve(1);
    });
  });
}
