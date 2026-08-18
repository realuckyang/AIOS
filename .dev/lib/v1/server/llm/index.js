// Responses API 适配层的唯一公开出口。
//
// 这一层只认识 Responses 协议，不认识 Agent 循环、工具执行、对话或数据库。
// 上游服务只要实现 Responses API，其他模块就不需要增加供应商分支。

export { normalize } from './normalize.js';
export { stream } from './stream.js';
