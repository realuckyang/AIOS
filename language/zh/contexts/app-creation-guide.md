# 应用开发指导

这是 AIOS 新建和修改应用的数据库内置系统记忆版本。

## 基本原则

- 应用后端代码放在 `server/apps/<appname>/`
- 应用前端代码放在 `ui/src/apps/<appname>/`
- 应用说明文档放在 `apps/<appname>/APP.md`
- `language/` 只是安装和运行副本烘焙源,AI 创建应用时不要创建或修改 `language/<lang>/apps/<appname>/`
- 不要把应用服务代码写到顶层 `apps/` 目录;顶层 `apps/<appname>/APP.md` 只放应用说明
- 新应用必须注册到 `ui/src/apps.js`,显示在应用入口中
- 禁止直接修改 `ui/dist/` 或任何构建后的压缩产物;必须修改源码后构建

## 后端约定

- 每个有后端的应用至少包含 `index.js`、`api/index.js`、`service/`、`repository/`
- `index.js` 默认导出对象,包含 `name`、`match`、`handleApi`
- 新应用必须注册到 `server/apps/registry.js`
- 改完 `server/apps/` 下代码后,需要触发 apps reload 才会生效

## API 约定

- 应用 API 统一走 `/apps/<appname>/<action>`
- 前端请求必须使用 `/apps/<appname>/<action>`,不要加 `/aios` 前缀
- shell 验证用 `http://127.0.0.1:9502/apps/<appname>/<action>`
- 查询类接口用 `GET`
- 变更类接口用 `POST + JSON body`
- 读取 body 使用 `readBody(req)`
- 返回 JSON 使用 `json(res, data, status?)`
- 未命中路径时返回 `false`

## 数据库约定

- 应用数据库通过 `createAppDb()` 创建
- 建表放在 `repository/init.js`
- SQL 操作拆到各自的 `repository/<action>.js`
- AIOS 当前开发期默认不保留旧数据兼容;改表时直接维护当前最终 schema,不要写临时迁移和旧接口垫片

## 前端约定

- 应用界面放在 `ui/src/apps/<appname>/`
- 参考现有应用结构和视觉语言,不要照搬 Express、Electron 或桌面后台风格
- 改了 `ui/` 下源码后,reload 时必须带上 `build: true`
- 不要手写或 patch `ui/dist/assets/*.js`;这些文件只由 Vite build 生成

## 重载约定

- 改 `server/apps/`: `restartApps: true`
- 改 `server/main/`、`server/shared/`、`server/ai/`、`server/llm/`、`server/main/service/prompt/`: `restartServer: true`
- 改 `ui/`: `build: true`
- 改完后必须用真实接口和前端入口验证,不能只检查文件存在

## 补充

- 系统级应用 `chat`、`settings`、`tasks` 是特例,不在 `server/apps/`
- 长期行为变更优先落到代码,不做只靠临时命令的补丁
