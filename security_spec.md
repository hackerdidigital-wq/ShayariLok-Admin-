# Security Specification: Shayari Lok Admin Panel

## 1. Data Invariants
1. A user profile at `/users/{userId}` can only be read, created, or updated by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`), and `uid` inside the payload must strictly match `request.auth.uid`. `createdAt` is immutable and must equal `request.time` on creation.
2. GitHub connection settings at `/users/{userId}/settings/{settingId}` require a valid parent `/users/{userId}` document (`exists(...)`), strict `ownerId == request.auth.uid`, bounded string lengths, and server-verified `updatedAt == request.time`.
3. Cloud config drafts at `/users/{userId}/drafts/{draftId}` require a valid parent `/users/{userId}` document, strict `ownerId == request.auth.uid`, exact key allowlisting (`hasAll` + `hasOnly`), bounded lists (`categories.size() >= 1 && categories.size() <= 50`, `notifications.size() <= 100`, `shayari_list.size() <= 500`), type validation for every `config.json` field, and `updatedAt == request.time`.
4. Publish logs at `/users/{userId}/publishLogs/{logId}` are append-only (no client updates or deletes to preserve audit integrity), require parent `/users/{userId}`, strict `ownerId == request.auth.uid`, and `createdAt == request.time`.
5. No user may list `/users` globally or read another user's subcollections.
6. Document IDs `{userId}`, `{settingId}`, `{draftId}`, `{logId}` must pass `isValidId()` (`^[a-zA-Z0-9_\\-]+$`, length <= 128).

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)
1. **Unauthenticated read/write** to `/users/uid1/drafts/default` -> `PERMISSION_DENIED`.
2. **Unverified email (`email_verified: false`)** creating `/users/uid1` -> `PERMISSION_DENIED`.
3. **Cross-tenant read/write**: User `uid2` attempting to read or write `/users/uid1/settings/github` -> `PERMISSION_DENIED`.
4. **Identity spoofing**: User `uid1` creating `/users/uid1/drafts/default` with `ownerId: "uid2"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost field injection**: User `uid1` writing `/users/uid1` with extra `isAdmin: true` or `role: "superadmin"` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/users/uid1/drafts/bad$id..with..dots` or 500-char ID -> `PERMISSION_DENIED`.
7. **Timestamp forgery**: Creating `/users/uid1/publishLogs/log1` with client-supplied past `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Immutable field mutation**: Updating `/users/uid1` to change `createdAt` or `uid` -> `PERMISSION_DENIED`.
9. **Type poisoning on config draft**: Setting `latest_version_code: "1"` (string instead of int) or `ads_enabled: "true"` -> `PERMISSION_DENIED`.
10. **Array flooding / Denial of Wallet**: Sending `categories` with 51+ entries or `categories` empty (`size() == 0`) -> `PERMISSION_DENIED`.
11. **Orphaned subcollection write**: Writing `/users/uid1/drafts/default` when `/users/uid1` parent profile does not exist -> `PERMISSION_DENIED`.
12. **Audit log tampering**: Attempting to `update` or `delete` `/users/uid1/publishLogs/log1` -> `PERMISSION_DENIED`.
