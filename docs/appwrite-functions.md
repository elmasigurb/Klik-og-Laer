# Trusted Appwrite Function deployment

The `content-manager` Function is the production boundary for operations that change public visibility across multiple resources. The browser cannot publish, archive, replace, or permanently delete Appwrite exercises, and cannot publish or restore Appwrite CMS content, unless `VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID` is configured.

Source: `appwrite/functions/content-manager`

## Configure the existing Function

The production project already uses the Function ID `content-manager`. Update that Function; do not create a second Function.

In Appwrite Console:

1. Open **Functions > content-manager** and record the current active deployment ID so it can be reactivated as a rollback.
2. Keep the current supported Node.js runtime.
3. Set **Execute access** to the existing **Teachers** Team only. Do not grant `Any`, `Users`, or public execution access.
4. Set the source root to `appwrite/functions/content-manager`.
5. Set the install/build command to `npm ci` and the entrypoint to `src/main.mjs`.
6. Grant the Function ephemeral key only these scopes:
   - `rows.read`
   - `rows.write`
   - `files.read`
   - `files.write`
7. Do not add `users.write`, `teams.write`, bucket-management, table-management, or project-management scopes.

The Function uses the caller JWT to load the caller's Account and the Teachers Team. It uses the scoped ephemeral key only after that membership check succeeds.

## Function variables

Add these non-secret variables using the existing resource IDs:

| Variable | Value |
| --- | --- |
| `TEACHERS_TEAM_ID` | `6ad64dd70008ff442075` |
| `DATABASE_ID` | `6ad64e6a0015e01c4bf5` |
| `EXERCISES_TABLE_ID` | `6ad64e870009188abc4b` |
| `CLASSES_TABLE_ID` | `classes` (or the provisioned custom ID) |
| `EXERCISE_CLASSES_TABLE_ID` | `exercise-classes` (or the provisioned custom ID) |
| `CONTENT_TABLE_ID` | `6ad64e92001980e581e5` |
| `CONTENT_VERSIONS_TABLE_ID` | `6ad64e9b0000b33ee084` |
| `EXERCISE_FILES_BUCKET_ID` | `6ad64ee2003b389897da` |

Do not manually create `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`, or a permanent API key. Appwrite injects the endpoint/project variables and provides a per-execution ephemeral key.

Environment-variable changes take effect only after a new deployment. Add `CLASSES_TABLE_ID` and `EXERCISE_CLASSES_TABLE_ID` before creating the deployment.

## Prepare and deploy the reviewed source

The reviewed source root contains only `package.json`, `package-lock.json`, `src/main.mjs`, `src/authorization.mjs`, and `src/operations.mjs`. From `appwrite/functions/content-manager`, package it for a manual deployment:

```bash
tar --exclude='node_modules' --exclude='code.tar.gz' -czf code.tar.gz package.json package-lock.json src
```

Then in **Functions > content-manager > Deployments**:

1. Click **Create deployment** and select **Manual**.
2. Set the entrypoint to `src/main.mjs`.
3. Upload `code.tar.gz`.
4. Leave automatic activation off until the build succeeds and its logs show `npm ci` completed.
5. Activate the successful deployment.
6. If verification fails, reactivate the previously recorded deployment. Do not delete either deployment during verification.

Creating or activating a deployment does not execute an action by itself and therefore does not create or modify rows or files. Data changes occur only when an authorized teacher later invokes a supported action.

## Deploy and connect the frontend

1. Deploy the Function and make its deployment active.
2. Execute it without a session and confirm it returns HTTP 401/403.
3. Copy the Function ID to the frontend environment variable:

   ```text
   VITE_APPWRITE_CONTENT_MANAGER_FUNCTION_ID=content-manager
   ```

4. Rebuild and redeploy the Vite application.
5. Sign in with the existing teacher account and run the workflow below.

## Production verification matrix

Use unique test names so the records are easy to identify without touching existing content.

1. Unauthenticated: execute every Function action and confirm 401/403.
2. Authenticated non-team account: confirm every action returns 403.
3. Teacher: create a private category and draft HTML exercise.
4. Before publication: direct row and file URLs must return 401/404 without a session.
5. Publish: public metadata and HTML must return 200 and the exercise must open in the sandboxed iframe.
6. Archive: public metadata must disappear and the same file URL must return 401/404.
7. Republish: the same exercise and file become public again without re-uploading.
8. Replace: upload a new private HTML file, replace through the Function, confirm the new file works and the old URL returns 401/404.
9. CMS: save a draft, confirm it is private, publish it, and verify a private immutable version row was created.
10. Restore: restore an older version and verify a new version row records the restoration.
11. Delete: explicitly confirm deletion, then verify both metadata and file URL return 401/404.
12. Classes: confirm teachers can mutate only classes they own, archived classes disappear publicly, and restoring a duplicate name fails.
13. Assignments: bulk-add and bulk-remove assignments, then confirm only active-class/published-exercise relationships are publicly readable.

The supported class-management actions are `class.create`, `class.update`, `class.setStatus`, `class.reorder`, and `exercise.setClasses`. `exercise.setClasses` accepts `add`, `remove`, and single-exercise `replace` modes. The earlier internal name `exercise.assignClasses` remains an alias for compatibility but is not used by the frontend.

Re-run `npm run audit:appwrite`, `npm run test:authorization`, `npm run typecheck`, and `npm run build` after deployment.
