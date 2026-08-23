// 设置。只存被改过的键:恢复默认就是删掉这一行,加新设置不用动库。
import { database } from '../db/client.js';

export function allSettings() {
  const out = {};
  for (const row of database().prepare('SELECT key, value FROM settings').all()) {
    try { out[row.key] = JSON.parse(row.value); } catch { /* 值坏了就当没设置过 */ }
  }
  return out;
}

export function writeSetting(key, value) {
  database().prepare(`INSERT INTO settings(key, value, at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, at = excluded.at`)
    .run(key, JSON.stringify(value), new Date().toISOString());
}

export function clearSetting(key) {
  database().prepare('DELETE FROM settings WHERE key = ?').run(key);
}
