// 老 desktop core/env 兼容层 — 直接读 process.env(由 server/main/env.js 提前 dotenv 注入)
const BROWSER_CHANNEL = process.env.BROWSER_CHANNEL || 'chrome';
const SESSION_PASSWORD = String(process.env.SESSION_PASSWORD || '').trim();
const DEBUG = process.env.DEBUG === '1';
module.exports = { BROWSER_CHANNEL, SESSION_PASSWORD, DEBUG };
