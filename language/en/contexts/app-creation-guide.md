# App Development Guide

This is the built-in system memory for creating and modifying AIOS apps.

## Basics

- App backend code goes in `server/apps/<appname>/`
- App frontend code goes in `ui/src/apps/<appname>/`
- App documentation goes in `apps/<appname>/APP.md`
- `language/` is only a bake source for install/runtime copies. Do not create or edit `language/<lang>/apps/<appname>/` when building an app at runtime
- Do not put app service code in the top-level `apps/` directory; top-level `apps/<appname>/APP.md` is documentation only
- New apps must be registered in `ui/src/apps.js`
- Never edit `ui/dist/` or built/minified assets directly; edit source and build

## Backend

- Each backend app should include `index.js`, `api/index.js`, `service/`, and `repository/`
- `index.js` default-exports an object with `name`, `match`, and `handleApi`
- New apps must be registered in `server/apps/registry.js`
- Changes under `server/apps/` require an apps reload

## API

- App APIs use `/apps/<appname>/<action>`
- Frontend requests must use `/apps/<appname>/<action>` with no `/aios` prefix
- Shell verification should call `http://127.0.0.1:9502/apps/<appname>/<action>`
- Read endpoints use `GET`
- Mutating endpoints use `POST + JSON body`
- Read request bodies with `readBody(req)`
- Return JSON with `json(res, data, status?)`
- Return `false` for unmatched paths

## Database

- App databases are created with `createAppDb()`
- Table creation belongs in `repository/init.js`
- SQL operations should be split into `repository/<action>.js`
- AIOS is currently in active development and does not default to historical schema compatibility. Keep the current final schema clean unless the user explicitly asks for data preservation

## Frontend

- App UI lives in `ui/src/apps/<appname>/`
- Follow existing app structure and visual language
- If `ui/` source changes, reload with `build: true`
- Do not hand-edit or patch `ui/dist/assets/*.js`; those files are generated only by Vite build

## Reload

- Changes under `server/apps/`: `restartApps: true`
- Changes under `server/main/`, `server/shared/`, `server/ai/`, `server/llm/`, or `server/main/service/prompt/`: `restartServer: true`
- Changes under `ui/`: `build: true`
- Verify with real APIs and the app entry after changes; file existence alone is not enough

## Notes

- System apps `chat`, `settings`, and `tasks` are special cases and do not live in `server/apps/`
- Persistent behavior changes should land in code, not in temporary shell patches
