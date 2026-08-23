// 模型凭据的**兜底**来源:内核自己的环境 `etc/env.json`(经 AIOS_ENV 交给内核)。
//
// 正常路径下凭据由 App 随 run 请求传进来(App 是唯一真相:设置页写库)。内核**不碰 App 的库**,
// 只是个无状态执行器。这个兜底只兜一种情况:**App 挂了、浏览器直连内核自愈**——那时没有 App
// 传参,内核从自己的 env.json 取一份能用的凭据(App 存设置时会把凭据镜像进 env.json)。
//
// 每次现读,不在启动时定死;凭据仍不接受由单次 run 的内容指定。

import { readEnv } from '../host.js';

const KEYS = ['responsesUrl', 'apiKey', 'model'];

export function creds(fallback) {
  const env = readEnv() ?? {};
  const out = {};
  for (const key of KEYS) {
    const v = env[key];
    out[key] = (typeof v === 'string' && v) ? v : (fallback?.[key] ?? '');
  }
  return out;
}
