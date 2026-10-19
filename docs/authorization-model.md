# Klik & Lær authorization model

## Actors

Klik & Lær has two actors only:

- Public visitors browse and run published exercises without an Appwrite account.
- The teacher signs in with Appwrite Authentication and must belong to the configured Teachers Team.

There is no public signup, student account, anonymous session, profile, or progress write path. Existing unused profile/progress resources may remain in Appwrite, but this application does not address them.

## Server-enforced access

| Resource | Public visitor | Teachers Team |
| --- | --- | --- |
| Published categories | Read | Read and manage |
| Hidden categories | No access | Read and manage |
| Published exercise metadata | Read | Read and manage |
| Draft/archived exercise metadata | No access | Read and manage |
| Published website content | Read | Read and manage |
| Content drafts/history | No access | Read and manage |
| Published exercise HTML | Read | Read and manage |
| Draft/archived exercise HTML | No access | Read and manage |

All managed tables have row security enabled. Table-level create/read/update/delete belongs only to the Teachers Team. Published rows add `read("any")`; draft, hidden, archived, and history rows do not. The Storage bucket has File Security enabled and no bucket-level public read permission. Published files alone add `read("any")`.

The browser never receives an API key and cannot create Team memberships. Add or remove the teacher in Appwrite Console or another separately secured server-side workflow.

## Trusted publication transition

Publishing, archiving, replacing, or deleting an uploaded exercise touches both a TablesDB row and a Storage file. The browser implementation refuses these Appwrite operations unless the trusted `content-manager` Function ID is configured. New uploads receive teacher-only file permissions before any metadata row is created.

The included Function:

1. reject executions without an authenticated user;
2. verify that user is a member of the configured Teachers Team;
3. load the target row and referenced file server-side;
4. derive all row/file IDs and permissions from stored state, not untrusted request values;
5. update file and row permissions together, restoring former permissions if either operation fails;
6. permit public read only when the final state is `published`;
7. keep draft and archived files teacher-only;
8. log the operation without logging secrets or uploaded HTML.

CMS publication and restoration use the same Function to create the published row and immutable version snapshot with a server-derived teacher ID. Deployment steps and the required verification matrix are in [appwrite-functions.md](appwrite-functions.md). Until those Function paths are deployed and tested with direct unauthenticated and teacher requests, treat the integration as development-ready, not production-ready.

Uploaded HTML still runs in an iframe sandbox without `allow-same-origin`. Authorization controls who can fetch a file; it does not make arbitrary JavaScript trustworthy.
