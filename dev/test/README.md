# AIOS Test Runtime

Run AIOS from an isolated copied runtime:

```bash
node dev/test/start.mjs
```

The script creates `dev/test/aios`, copies the current repository source into it,
bakes the selected language pack, builds the UI, then starts system, apps, and Vite.

Keep runtime data while syncing source:

```bash
node dev/test/start.mjs --keep-db
```

`--keep-db` preserves:

- `dev/test/aios/.aios`
- `dev/test/aios/database`
- `dev/test/aios/files`

Select language:

```bash
node dev/test/start.mjs en
node dev/test/start.mjs zh --keep-db
```

Default ports:

- UI: `15173`
- system: `19502`
- apps: `19503`

Override with `AIOS_TEST_UI_PORT`, `AIOS_TEST_MAIN_PORT`, and `AIOS_TEST_APPS_PORT`.
