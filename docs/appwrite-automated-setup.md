# Appwrite automated schema setup

The setup command uses the official `node-appwrite` Server SDK. It targets the configured tables, Teachers Team, and exercise-files bucket. It does not create or delete databases, tables, buckets, rows, or files.

Class tables are intentionally provisioned separately. `npm run provision:class-tables` is read-only by default; its explicitly approved `--apply` mode can create only the two missing empty tables. After that, the normal setup command adds their columns and indexes. See [Class management rollout](class-management-migration.md).

## Dry run

```sh
npm run setup:appwrite
```

Dry-run mode is the default. It uses `APPWRITE_AUDIT_KEY` when present, or falls back to the read-capable `APPWRITE_SETUP_KEY`. It verifies that every configured resource exists, checks existing columns and indexes for conflicts, and prints every proposed change. It never sends a write request.

## Apply

Create a temporary server API key named `APPWRITE_SETUP_KEY` in `.env.local`. Never prefix it with `VITE_`.

Minimum setup scopes:

- `teams.read`
- `tables.read`, `tables.write`
- `columns.read`, `columns.write`
- `indexes.read`, `indexes.write`
- `buckets.read`, `buckets.write`

If the same temporary key will also be used by `npm run audit:appwrite`, add:

- `rows.read`
- `files.read`

No database, row, file, user, team, or authentication write scope is required. After explicit approval, apply the reviewed plan with:

```sh
npm run setup:appwrite -- --apply
```

The apply mode refuses incompatible same-key columns or indexes, waits for asynchronous column/index creation, and can be rerun safely. Existing extra schema objects are preserved. The existing HTML file and all local browser data are untouched.

After a successful apply, rerun:

```sh
npm run audit:appwrite
```

Then delete or revoke the temporary setup key.
