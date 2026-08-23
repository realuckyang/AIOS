// Skills 是 App/userland 资源：App 只负责发现和展示，Kernel 不读取。
import fs from 'node:fs';
import path from 'node:path';
import { HOME } from '../../../../host.js';

// 目录在仓库根级 skills/ —— 它是发行内容不是 App 实现的一部分,和生态惯例一致
const ROOT = path.join(HOME, 'skills');
const VALID_ID = /^[a-z0-9-]+$/;

function quotedValue(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*["'](.*)["']\\s*$`, 'm'));
  return match?.[1] ?? '';
}

function readSkill(id) {
  if (!VALID_ID.test(id)) return null;
  const dir = path.join(ROOT, id);
  const skillFile = path.join(dir, 'SKILL.md');
  try {
    const content = fs.readFileSync(skillFile, 'utf8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? '';
    const metadata = fs.existsSync(path.join(dir, 'agents', 'openai.yaml'))
      ? fs.readFileSync(path.join(dir, 'agents', 'openai.yaml'), 'utf8')
      : '';
    return {
      id,
      name: frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() || id,
      description: frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '',
      displayName: quotedValue(metadata, 'display_name') || id,
      shortDescription: quotedValue(metadata, 'short_description'),
      defaultPrompt: quotedValue(metadata, 'default_prompt'),
      content,
    };
  } catch { return null; }
}

export function listSkills() {
  try {
    return fs.readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && VALID_ID.test(entry.name))
      .map((entry) => readSkill(entry.name))
      .filter(Boolean)
      .map(({ content: _content, ...skill }) => skill)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch { return []; }
}

export function getSkill(id) { return readSkill(id); }
