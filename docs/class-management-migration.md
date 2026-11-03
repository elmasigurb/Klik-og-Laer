# Class management rollout

The class rollout is deliberately additive. It does not edit existing categories, exercises, files, website content, or student-progress rows, and it does not automatically place existing exercises in a catch-all class.

## 1. Configure IDs

Add these public resource IDs to the frontend, setup-tool, and Function environments:

```text
VITE_APPWRITE_CLASSES_TABLE_ID=classes
VITE_APPWRITE_EXERCISE_CLASSES_TABLE_ID=exercise-classes
```

Keep the public feature disabled:

```text
VITE_PUBLIC_CLASS_NAVIGATION_ENABLED=false
```

Add these variables to the `content-manager` Function:

```text
CLASSES_TABLE_ID=classes
EXERCISE_CLASSES_TABLE_ID=exercise-classes
```

## 2. Review and provision empty tables

Both commands are dry-run/read-only by default:

```bash
npm run provision:class-tables
npm run setup:appwrite
```

After reviewing their JSON plans and receiving production-change approval, run:

```bash
npm run provision:class-tables -- --apply
npm run setup:appwrite -- --apply
```

The first command creates only missing, empty `classes` and `exercise-classes` tables. The second adds the reviewed columns, indexes, Row Security, and empty table-level permissions. Neither command creates, edits, assigns, or deletes content rows.

## 3. Deploy the trusted Function before using the admin UI

Deploy the updated Function with teacher-team-only execution access. It needs the existing `rows.read`, `rows.write`, `files.read`, and `files.write` scopes. Test unauthenticated, non-teacher, and teacher requests before enabling class writes in production.

Class and assignment writes are Function-only. Active rows receive public read plus owner read; archived/private rows receive owner read only. The Function derives ownership from the verified caller and rejects changes to another teacher's classes or assignments.

## 4. Organize existing exercises

With public class navigation still disabled:

1. Open `/admin/classes` and create the real classes required by the teacher.
2. Open `/admin/exercises`.
3. Filter or search exercises, select multiple rows, select one or more classes, and choose **Add to selected classes**.
4. Use **Remove from selected classes** to correct a bulk assignment without affecting other classes.
5. Edit an individual exercise when an exact assignment set is more convenient.

No existing exercise is assigned automatically. Exercise IDs, category IDs, publication states, and HTML file IDs remain unchanged.

## 5. Verify readiness

Run the read-only reports:

```bash
npm run audit:appwrite
npm run audit:class-readiness
```

The readiness report lists every published exercise that is still unassigned and every active class without published exercises. Review the admin readiness panel as well.

## 6. Enable public class navigation

Only after assignments have been reviewed, set:

```text
VITE_PUBLIC_CLASS_NAVIGATION_ENABLED=true
```

Rebuild and deploy the frontend. The flag adds the anonymous **Vælg klasse** selector and changes the student flow to `Class → Categories → Exercises`. The selected active class is stored only in that browser's local storage and is also carried in class-scoped URLs. No student account or progress record is created. Unscoped legacy routes remain available for old links, but resolve through the selected class while the feature is enabled.

Rollback requires only setting the flag back to `false` and redeploying. Class and assignment data can stay in place.

## 7. Uploaded exercise sizing

Uploaded HTML is never inserted into the React document. At render time, the frontend creates an in-memory copy with a small resize bridge and loads it into the existing sandboxed iframe. The stored Appwrite file is not changed.

The bridge observes layout, DOM, font, image, feedback, and viewport changes and reports a bounded integer height. The parent accepts a resize only from the exact iframe window, the sandbox's opaque `null` origin, the current protocol version, and an unpredictable per-frame identifier. The iframe sandbox remains `allow-scripts allow-forms`; `allow-same-origin` is deliberately not enabled.

If a document prevents the bridge from running or replaces its entire document lifecycle, the page falls back to a contained scrolling frame with a user-controlled height increase. Securely measuring an uncooperative cross-origin sandbox from the parent is not possible without weakening the sandbox.
