# plugins/ — Mongoose Schema Plugins

Mongoose plugins that are applied to every domain model to provide cross-cutting concerns.

## Files

| File | Purpose |
|------|---------|
| `auditPlugin.ts` | Adds `createdBy` and `updatedBy` fields (ObjectId refs to `User`). Automatically sets them on `save`, `findOneAndUpdate`, `updateMany`, and `updateOne` hooks using the current user from `requestContext`. |
| `softDeletePlugin.ts` | Adds `isDeleted`, `deletedAt`, `deletedBy` fields. Overrides `find`, `findOne`, `findOneAndUpdate`, `countDocuments`, and `aggregate` to exclude soft-deleted docs by default. Adds `softDelete()` and `restore()` instance methods, and an `includeDeleted()` query helper. |

## How They Connect

- Both plugins read the current user via `getRequestUserId()` from `core/middleware/requestContext.ts` — no need to pass userId manually.
- Every model in `modules/` calls `schema.plugin(auditPlugin)` and `schema.plugin(softDeletePlugin)`.
- The `delete` endpoints in services call `doc.softDelete()` instead of `doc.remove()`, preserving data for audit trails.
