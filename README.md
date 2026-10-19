# Klik & Lær

Klik & Lær is a public Danish exercise library with a separate, teacher-only administration area. Visitors do not create accounts and results are never persisted. The authorized teacher manages categories, HTML exercises, and website copy through Appwrite.

## Start locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run the project checks with:

```bash
npm run typecheck
npm run build
```

## Public experience

Only published categories, exercise metadata, HTML files, and website copy are public. Uploaded exercises run in a sandboxed iframe without `allow-same-origin`; any score or feedback exists only for the current page session.

There is no student registration, login, profile, dashboard, or progress repository. Older browser records are not read or deleted.

## Teacher administration

Open `/admin/login` and sign in with an existing Appwrite account that belongs to the configured Teachers Team. Public registration and demo credentials are not provided.

The dashboard supports:

- category creation, editing, ordering, publication, hiding, and deletion;
- HTML upload/replacement and assignment to categories;
- draft, published, and archived exercise states;
- permanent deletion behind explicit confirmation;
- website-copy drafts, preview, publication, history, and restoration.

When Appwrite contains no managed rows, the application keeps showing the existing local Phase 1/2 data. A signed-in teacher can explicitly import each local repository under `/admin/settings`. Import never removes the localStorage/IndexedDB copy and refuses to run against non-empty target tables.

## Security boundary

React route guards improve navigation but are not authorization. TablesDB row permissions and Storage file permissions enforce teacher-only modification and public read access only for published rows/files. API keys are server-side tooling secrets and must never use a `VITE_` name.

Publishing an exercise changes both its row and file permissions. Appwrite-backed publication, archiving, replacement, permanent deletion, CMS publication, and restoration are therefore blocked until the trusted Function is configured. Follow [the Function deployment guide](docs/appwrite-functions.md), then run the direct public/teacher verification matrix before treating the deployment as production-ready.

The live schema can be checked with `npm run audit:appwrite`; the reviewed idempotent configuration tool is documented in [Appwrite automated setup](docs/appwrite-automated-setup.md).
