// 与 App SQLite 数据、API 和 SSE 事件对应的类型
// (字段以实际数据为准,保持宽松,避免模型供应商差异导致渲染崩溃)

export interface ChatMeta {
  id: string;
  title: string;
  description: string;
  context_start: number;
  /** 非 null = 置顶,值即置顶时间(新置顶在上) */
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
  status?: 'running' | 'idle' | 'deleted';
  /** 对话累计 tokens(计费口径,getChat 时聚合;列表接口不带) */
  usage_input?: number;
  usage_output?: number;
  /** usage_input 里命中提示缓存的部分,单价不同 */
  usage_cached?: number;
}

export type ItemSource = 'user' | 'model' | 'runtime' | 'tool';

export interface ContentPart {
  type?: string;
  text?: string;
  /** input_image 部分:data: 或 http(s) URL */
  image_url?: string;
}

export type Item =
  | { type: 'message'; role?: string; content: string | ContentPart[] }
  | { type: 'reasoning'; id?: string; status?: string; content?: ContentPart[]; summary?: ContentPart[] }
  | { type: 'function_call'; id?: string; call_id?: string; name?: string; arguments?: string; status?: string }
  | { type: 'function_call_output'; call_id?: string; output?: string; status?: string };

export interface Row {
  seq: number;
  source: ItemSource;
  item: Item;
  at: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  };
}

export interface ToolOutput {
  exit_code?: number;
  stdout?: string;
  stderr?: string;
}

export type ConfigFieldType = 'string' | 'secret' | 'number' | 'ratio' | 'text';

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: ConfigFieldType;
  source: 'env' | 'limits' | 'settings';
  restartRequired: boolean;
  value: string | number;
  default: string | number;
  changed: boolean;
}

export interface ConfigGroup {
  id: string;
  title: string;
  divider?: boolean;
  fields: ConfigField[];
}

export interface ConfigSchema {
  values: Record<string, string | number>;
  groups: ConfigGroup[];
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string;
}

export interface SkillDetail extends SkillSummary {
  content: string;
}

export interface ToolParameterSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolSummary {
  name: string;
  description: string;
  parameters: ToolParameterSchema | null;
}

export interface ToolDetail extends ToolSummary {
  exec: string;
}

export interface AppHealth {
  ok: boolean;
  instanceId: string;
  startedAt: string;
}

export interface RestartRequest {
  id: string;
  summary: string;
  reason: string;
  status: 'pending' | 'restarting' | 'succeeded' | 'cancelled';
  created_at: string;
  confirmed_at?: string | null;
  completed_at?: string | null;
  instance_id?: string | null;
  /** 重启完成后前端要跳回的对话 id(可空) */
  target_chat?: string | null;
}

// ---------- SSE 事件 ----------
export interface StatusEvent {
  chatId: string;
  status: string;
}

export interface RowEvent {
  chatId: string;
  row: Row;
}

export interface StreamEvent {
  chatId: string;
  delta?: string;
  row?: Row;
}

export interface ErrorEvent {
  chatId: string;
  message: string;
}

export type AiosEvent =
  | { type: 'status'; data: StatusEvent }
  | { type: 'input'; data: RowEvent }
  | { type: 'reasoning'; data: StreamEvent }
  | { type: 'message'; data: StreamEvent }
  | { type: 'tool_calls'; data: RowEvent }
  | { type: 'tool_results'; data: RowEvent }
  | { type: 'done'; data: { chatId: string } }
  | { type: 'error'; data: ErrorEvent }
  | { type: 'gap'; data: unknown };

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  source: 'manual' | 'agent' | 'runtime';
  created_at: string;
  updated_at: string;
}
