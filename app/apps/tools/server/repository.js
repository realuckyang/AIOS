// Tools 是 Kernel 侧注册的模型工具(App 只负责发现和展示,不执行)。
// 数据源:etc/tools.json {name, description, parameters, exec}
import fs from 'node:fs';
import path from 'node:path';
import { HOME } from '../../../../host.js';

const FILE = path.join(HOME, 'etc', 'tools.json');

function readTools() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!Array.isArray(data)) return [];
    return data
      .filter((tool) => tool && typeof tool.name === 'string' && tool.name)
      .map((tool) => ({
        name: tool.name,
        description: typeof tool.description === 'string' ? tool.description : '',
        parameters: tool.parameters && typeof tool.parameters === 'object' ? tool.parameters : null,
        exec: typeof tool.exec === 'string' ? tool.exec : '',
      }));
  } catch { return []; }
}

export function listTools() {
  return readTools().map(({ exec: _exec, ...tool }) => tool);
}

export function getTool(name) {
  return readTools().find((tool) => tool.name === name) ?? null;
}
