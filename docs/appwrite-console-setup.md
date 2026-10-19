# Appwrite Console setup for Klik & Lær

The frontend is connected to project `6ad64a7e0029a09d30eb` at `https://fra.cloud.appwrite.io/v1`. Endpoint and resource IDs are public identifiers, not secrets. Never add an API key to the Vite environment.

## 1. Web platform and Auth

1. In the project, add a **Web app/platform** for each hostname that will run Klik & Lær. Add `localhost` for development and the exact production hostname before deployment.
2. Under **Auth > Settings**, enable email/password authentication. Set password and abuse-prevention policies appropriate for the school. Decide whether verified email is required before remote student data is enabled.
3. The student registration UI creates ordinary Auth users. It does not create Teams or memberships.

## 2. Teachers Team

1. Under **Auth > Teams**, create one Team named `Klik & Lær Teachers` (an ID such as `teachers` is suitable).
2. Copy its ID to `VITE_APPWRITE_TEACHERS_TEAM_ID` in `.env.local` and in the production host's environment variables.
3. Invite teachers from Appwrite Console or a trusted server-side administration workflow. Do not expose `teams.create`, `teams.createMembership`, owner-role changes, or API keys to students.
4. Remove a teacher from this Team to revoke access. Do not use an editable profile column as an authorization role.

## 3. TablesDB database and tables

Create one database, for example `klik-og-laer`, and copy its ID to `VITE_APPWRITE_DATABASE_ID`. Create the following tables with **row security enabled**. The suggested custom IDs match `.env.example`.

### `profiles`

| Column | Type | Required / notes |
| --- | --- | --- |
| `userId` | string, 36 | required; unique index |
| `displayName` | string, 128 | required |
| `createdAt` | datetime | required |

Keep profile rows private to the matching user and the teachers Team. Prefer a trusted Function for profile creation so `userId` always comes from the authenticated execution.

### `categories`

| Column | Type | Required / notes |
| --- | --- | --- |
| `name` | string, 128 | required |
| `slug` | string, 128 | required; unique index |
| `description` | string, 2000 | required |
| `eyebrow` | string, 128 | required |
| `icon` | string, 64 | required |
| `tone` | string, 32 | required |
| `displayOrder` | integer | required; index |
| `isPublished` | boolean | required; index |

### `exercises`

| Column | Type | Required / notes |
| --- | --- | --- |
| `categoryId` | string, 36 | required; index |
| `title` | string, 200 | required |
| `description` | string, 2000 | required |
| `duration` | integer | required |
| `difficulty` | string, 32 | required |
| `kind` | string, 32 | required |
| `accent` | string, 32 | required |
| `isPublished` | boolean | required; index |
| `sourceType` | string, 32 | required |
| `fileId` | string, 36 | optional |
| `fileName` | string, 255 | optional |
| `fileSize` | integer | optional |

Add a compound index on `categoryId` and `isPublished`.

### `site-content`

| Column | Type | Required / notes |
| --- | --- | --- |
| `pageId` | string, 64 | required; index |
| `contentJson` | string, 65535 | required |
| `isPublished` | boolean | required; index |
| `version` | integer | required |
| `publishedAt` | datetime | optional |
| `publishedBy` | string, 36 | optional |

Store published and draft rows separately. Public read permission belongs only on the published row. A draft stays teachers-only.

### `content-versions`

Use the same content columns plus `sourceRowId` (string, 36), `label` (string, 200), and `createdAt` (datetime). This table is teachers-only; index `pageId` plus `version`.

### `student-progress`

| Column | Type | Required / notes |
| --- | --- | --- |
| `userId` | string, 36 | required; index |
| `exerciseId` | string, 36 | required; index |
| `status` | string, 32 | required |
| `lastAccessedAt` | datetime | required |
| `completedAt` | datetime | optional |
| `score` | integer | optional |
| `attempts` | integer | required |
| `savedAnswersJson` | string, 65535 | optional |

Add a unique compound index on `userId` and `exerciseId`. Do not enable direct client create until a trusted Function derives `userId` from the session and assigns row permissions. Students should receive read/update/delete only for their own rows; the teachers Team may receive read access for the progress dashboard.

## 4. Table and row permissions

For `categories`, `exercises`, `site-content`, and `content-versions`:

- Table-level create/read/update/delete: `team:<teachers-team-id>`.
- No public table-level read permission.
- Published row read: `any`.
- Draft row read/update/delete: teachers Team only.

Because Appwrite grants access if either table-level or row-level permission allows it, public read must be attached only to published rows. Use a trusted Appwrite Function to publish and restore content atomically and to assign the final permissions.

## 5. Storage

Create a bucket with custom ID `exercise-files`:

- Enable **File security**.
- Allow only the teachers Team to create, update, and delete at bucket level.
- Restrict extensions to `html` (and `htm` only if needed).
- Keep the existing 2 MB frontend limit or set a stricter matching bucket limit.
- Give `any` read permission only to files that have been published. Draft/replacement files stay teachers-only.
- Keep old files until the metadata transaction succeeds so a failed replacement does not break a published exercise.

Uploaded HTML can contain active JavaScript. Continue to serve/render it through the existing sandboxed strategy, and use a separate isolated origin before production.

## 6. Trusted Functions before remote writes

Create server-side Appwrite Functions for:

- publishing/unpublishing/restoring content and changing row/file permissions atomically;
- creating student progress rows from the verified user identity;
- replacing exercise files and updating metadata safely;
- any future teacher invitation or membership management.

Functions may use server credentials through Appwrite's runtime configuration. Those credentials must never be exposed to Vite or checked into Git.

## 7. Environment variables

Copy `.env.example` to `.env.local`, keep the supplied endpoint/project ID, and fill in the Team, database, table, and bucket IDs. `.env.local` and `.env.*.local` are Git-ignored. Configure the same `VITE_` variables in the production hosting environment, then rebuild.

## 8. Authorization test matrix

Do not call the integration production-secure until these requests have been tested against Appwrite, not merely hidden in React:

1. Guest can read published category/content/exercise rows and published files, but receives authorization errors for drafts and history.
2. Student can authenticate and read public content, cannot access teacher rows, upload/replace files, publish, delete, or create/join the teachers Team.
3. Student A cannot read or modify Student B's progress, including by changing IDs in a direct API request.
4. Teachers Team member can perform the intended CMS/catalog/storage operations.
5. Removing that membership immediately makes the same direct requests fail.
6. A failed publish/replacement leaves the previously published content/file intact.
