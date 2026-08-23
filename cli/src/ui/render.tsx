// 把入口与 JSX 隔开:index.ts 保持无 JSX,渲染只在这一处。
import { render } from 'ink';

import { App } from './App.js';
import type { Client, Row } from '../protocol.js';
import type { Config } from '../config.js';

export function renderApp(props: { client: Client; config: Config; initial: Row[] }): Promise<void> {
  // 自己接管 Ctrl-C(运行中先停、不忙才退),所以关掉 Ink 的默认退出。
  const instance = render(<App {...props} />, { exitOnCtrlC: false });
  return instance.waitUntilExit();
}
