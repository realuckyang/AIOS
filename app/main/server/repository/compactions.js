// 上下文折叠的产物。只追加不重写:旧摘要永不参与再压缩,前缀因此稳定。
import { database } from '../db/client.js';

export function allCompactions(threadId) {
  return database().prepare(`SELECT start_seq, end_seq, summary, kind, tokens FROM compactions
    WHERE thread_id = ? ORDER BY end_seq ASC`).all(threadId);
}

export function insertCompaction(threadId, { startSeq, endSeq, summary, kind, tokens = 0 }) {
  database().prepare(`INSERT OR REPLACE INTO compactions
    (thread_id, start_seq, end_seq, summary, kind, tokens, at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(threadId, startSeq, endSeq, summary, kind, tokens, new Date().toISOString());
}
