# Appwrite security audit — 2026-10-19

This report was generated with the local server-side `scripts/audit-appwrite.mjs` script and a temporary read-only API key. The key is loaded from the ignored `.env.local`, is never sent to browser code, and is not included in this report.

## Verified live state

- Project, database, all six configured tables, the Teachers Team, and the exercise-files bucket exist.
- The Teachers Team is named `Teachers` and has one member.
- All tables are enabled, empty, and currently have:
  - Row Security disabled;
  - no columns;
  - no indexes;
  - no table permissions.
- The exercise-files bucket is enabled and has encryption and antivirus enabled, but currently has:
  - File Security disabled;
  - no bucket permissions;
  - a 50 MB maximum file size;
  - no extension restriction.
- The bucket contains one existing HTML file. It has no file-level permissions. Do not delete it.

The current default-deny state prevents unauthorized access, but the tables cannot yet accept application rows and authorized teachers cannot manage them through the Web SDK.

## Required table configuration

Enable **Row Security** on all six tables.

Use the existing Teachers Team ID shown in `.env.local` for each `Teachers Team` permission below.

### Profiles

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `userId` | varchar | 36 | yes |
| `displayName` | varchar | 128 | yes |

Indexes:

- Unique index `profiles_user_id_unique` on `userId` ascending.

Table permissions:

- Teachers Team: read.
- Do not grant create to `users` or `any`; profile creation will go through a trusted Function.

Profile rows created by the Function must grant read/update to `user:<userId>` and read to the Teachers Team. Do not store an editable role column.

### Categories

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `name` | varchar | 128 | yes |
| `slug` | varchar | 128 | yes |
| `description` | text | — | yes |
| `eyebrow` | varchar | 128 | yes |
| `icon` | varchar | 64 | yes |
| `tone` | varchar | 32 | yes |
| `displayOrder` | integer | — | yes |
| `isPublished` | boolean | — | yes |

Indexes:

- Unique `categories_slug_unique` on `slug` ascending.
- Key `categories_order` on `displayOrder` ascending.
- Key `categories_published_order` on `isPublished` ascending, then `displayOrder` ascending.

Table permissions:

- Teachers Team: create, read, update, delete.
- No `any` or `users` table permission.

Published rows receive `read("any")`; unpublished rows never do. Teacher access is already supplied at table level.

### Exercises

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `categoryId` | varchar | 36 | yes |
| `title` | varchar | 200 | yes |
| `description` | text | — | yes |
| `duration` | integer | — | yes |
| `difficulty` | varchar | 32 | yes |
| `kind` | varchar | 32 | yes |
| `accent` | varchar | 32 | yes |
| `isPublished` | boolean | — | yes |
| `status` | varchar | 32 | yes |
| `sourceType` | varchar | 32 | yes |
| `fileId` | varchar | 36 | no |
| `fileName` | varchar | 255 | no |
| `fileSize` | integer | — | no |

Indexes:

- Key `exercises_published` on `isPublished` ascending.
- Key `exercises_status` on `status` ascending.
- Key `exercises_category_published` on `categoryId` ascending, then `isPublished` ascending.

Table permissions:

- Teachers Team: create, read, update, delete.
- No `any` or `users` table permission.

`status` is one of `draft`, `published`, or `archived`. Published rows receive `read("any")`; draft and archived rows never do.

`categoryId` is intentionally an indexed application reference. Do not add an Appwrite relationship column for Phase 3; the existing TypeScript domain model and migration identifiers use stable string IDs.

### Site content

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `pageId` | varchar | 64 | yes |
| `contentJson` | mediumtext | — | yes |
| `isPublished` | boolean | — | yes |
| `version` | integer | — | yes |
| `publishedAt` | datetime | — | no |
| `publishedBy` | varchar | 36 | no |

Indexes:

- Unique `content_page_state_unique` on `pageId` ascending, then `isPublished` ascending.
- Key `content_published` on `isPublished` ascending.

Table permissions:

- Teachers Team: create, read, update, delete.
- No public table read.

Each page may have one published row and one draft row. Only the published row receives `read("any")`.

### Content versions

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `pageId` | varchar | 64 | yes |
| `contentJson` | mediumtext | — | yes |
| `version` | integer | — | yes |
| `sourceRowId` | varchar | 36 | yes |
| `label` | varchar | 200 | yes |
| `publishedAt` | datetime | — | yes |
| `publishedBy` | varchar | 36 | yes |

Indexes:

- Key `versions_page_version` on `pageId` ascending, then `version` descending.
- Key `versions_published_at` on `publishedAt` descending.

Table permissions:

- Teachers Team: create, read, update, delete.
- No public or general authenticated-user permissions.

### Student progress

Columns:

| Key | Type | Size | Required |
| --- | --- | --- | --- |
| `userId` | varchar | 36 | yes |
| `exerciseId` | varchar | 36 | yes |
| `status` | varchar | 32 | yes |
| `lastAccessedAt` | datetime | — | yes |
| `completedAt` | datetime | — | no |
| `score` | integer | — | no |
| `attempts` | integer | — | yes |
| `savedAnswersJson` | mediumtext | — | no |

Indexes:

- Unique `progress_user_exercise_unique` on `userId` ascending, then `exerciseId` ascending.
- Key `progress_user_activity` on `userId` ascending, then `lastAccessedAt` descending.
- Key `progress_activity` on `lastAccessedAt` descending for the teacher dashboard.

Table permissions:

- Teachers Team: read.
- Do not grant create/read/update/delete to all `users` or `any`.

A trusted Function must derive `userId` from its authenticated execution context. Each created row grants read/update/delete only to that user and read to the Teachers Team.

## Required bucket configuration

For the configured exercise-files bucket:

1. Enable **File Security**.
2. Set maximum file size to `2097152` bytes (2 MB).
3. Restrict allowed extensions to `html` (add `htm` only if the product must accept it).
4. Keep encryption and antivirus enabled.
5. Add Teachers Team bucket permissions: create, read, update, delete.
6. Do not add public bucket-level read.

Published files receive file-level `read("any")`. Draft and replacement files remain teacher-only. The existing file currently has no permissions; preserve it and decide whether it is a draft or published file during the controlled migration.

## Trusted Functions required after remediation

After the schema passes a repeat audit, implement trusted Functions for:

- creating/updating student profile and progress rows using the verified session user ID;
- publishing/unpublishing exercises while changing the metadata row and HTML file permissions together;
- publishing/restoring CMS content and creating immutable version rows;
- safe HTML replacement with rollback behavior.

No API key may be included in frontend code or any `VITE_` environment variable.
