# Student progress implementation and rollout

Student progress is complete locally and disabled by default. It uses the existing Appwrite project, the existing `content-manager`, one new public `student-progress` Function, and two private tables. No separate staging project or third Function is required.

## Behavior

- On first visit, a student enters a name and selects an active class. Names are not unique and never authenticate or restore a profile.
- `student-progress` generates a 256-bit bearer credential. Only an HMAC-SHA-256 digest is stored; the browser retains the credential in local storage on the personal iPad.
- `student.me` validates the stored identity on later visits. `Skift elev` clears only the local credential after a warning. Clearing Safari data permanently breaks the browser's link to that profile.
- Final iframe result events are accepted only for one of the 36 audited exercise ID/signature/adapter combinations. The Function repeats the raw `earned * 100 >= possible * 80` check, checks any writing requirement, and requires a published exercise and published assignment to the student's current class.
- Only the first successful completion per student/exercise is stored. Answers, raw scores, failed attempts, unfinished work, and attempt IDs are not stored.
- `/admin/progress` lists students and completion dates by owned class, distinguishes identical names by a non-secret row-ID suffix, and supports rename, class move, and deletion with associated progress.
- Every dashboard result is labelled `client-reported`. Adapter and server validation prevent mismatches and accidental writes; they do not make a browser-controlled score tamper-proof.

The uploaded HTML remains inside `sandbox="allow-scripts allow-forms"`; `allow-same-origin` is absent. Stored HTML files are unchanged.

## Tables

`students` has 9 columns and 4 indexes: class/teacher ownership, display and normalized name, status, credential digest/version, registration digest, and optional last-seen time.

`exercise-completions` has 8 columns and 4 indexes: student/teacher/historical class/exercise, completion date, `client-reported` evidence, adapter ID, and HTML signature. `(studentId, exerciseId)` is unique.

Both tables require Row Security, empty table-level permissions, and empty row permissions. They must never grant direct browser read or write access. The legacy `student-progress` table is not read, migrated, or modified.

## Local schema command

The idempotent command is dry-run by default and targets only these two tables:

```bash
npm run provision:progress-tables
```

An approved apply later requires both a schema-write key and an exact project-ID confirmation:

```bash
npm run provision:progress-tables -- --apply --confirm-project=<exact-project-id>
```

Configure `APPWRITE_PROGRESS_AUDIT_KEY` for dry-run or `APPWRITE_PROGRESS_SETUP_KEY` for apply in ignored `.env.local`. Do not run apply without a separate review and approval. The command creates no rows.

## Function configuration

Shared secret/server values:

```text
DATABASE_ID=<existing-database>
STUDENTS_TABLE_ID=students
EXERCISE_COMPLETIONS_TABLE_ID=exercise-completions
STUDENT_CREDENTIAL_PEPPER=<at-least-32-random-bytes>
```

`student-progress` additionally uses `CLASSES_TABLE_ID`, `EXERCISES_TABLE_ID`, `EXERCISE_CLASSES_TABLE_ID`, and `REGISTRATION_IDEMPOTENCY_WINDOW_SECONDS=600`. It allows public execution and only `rows.read`/`rows.write` ephemeral scopes.

`content-manager` preserves all current configuration and adds the three progress variables above. Its execute access remains Teachers Team only; it keeps its existing row/file scopes. Both Functions use the same pepper. Appwrite Free's two-Function limit is satisfied by this layout.

## Frontend configuration

The Deploy Preview later needs:

```text
VITE_APPWRITE_STUDENT_PROGRESS_FUNCTION_ID=student-progress
VITE_STUDENT_PROGRESS_ENABLED=true
```

All existing Appwrite values remain unchanged. Production keeps `VITE_STUDENT_PROGRESS_ENABLED=false`. No secret, digest, or pepper belongs in a `VITE_` variable.

## Synthetic preview test

After separately approved schema and Function deployment:

1. Confirm both new tables are empty and private, then enable progress only for Pull Request #1's Deploy Preview.
2. Use clearly synthetic names such as `Test Elev A` and `Test Elev B`; never enter a real student name.
3. Register two synthetic students in one existing test class and two with the same display name to verify suffixes.
4. Complete one assigned exercise above 80%, one below 80%, and one writing exercise with and without its extra requirement.
5. Reload and verify `student.me`, completion persistence, card indicators, duplicate prevention, and class filtering.
6. Use `Skift elev`; verify the prior profile cannot be recovered by re-entering name/class.
7. In `/admin/progress`, verify totals/dates, rename, move between owned active classes, cross-class isolation, and the client-reported label.
8. Delete every synthetic student through the dashboard and verify both private tables return to zero rows.
9. Keep production disabled until the preview checks and a bounded anonymous-execution/rate-limit check are accepted.

## Remaining limitations

- The browser credential is intentionally recoverable only from that browser storage. There is no name-based recovery.
- Client-reported scores can be manipulated by a determined student and are not suitable as verified grading evidence.
- Appwrite Cloud does not expose a custom per-Function request quota. Before real use, measure normal classroom concurrency, 429 behavior, execution counts, and latency with a small bounded synthetic test. If platform abuse controls are inadequate, a separately approved throttle store would be required; it is not hidden inside these two tables.
- Retention is manual: teachers can delete a student and all associated completions. An automated school-year retention job is intentionally not included until a retention period is approved.
