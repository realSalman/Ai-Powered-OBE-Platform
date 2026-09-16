# middleware/ — Core Express Middleware

Reusable middleware used across all routes. Placed in `core/` because they are not domain-specific.

## Files

| File | Purpose |
|------|---------|
| `asyncHandler.ts` | Wraps async route handlers so rejected promises are forwarded to `errorHandler` via `next(err)` instead of crashing. |
| `errorHandler.ts` | Global Express error handler (registered last). Catches `AppError` subclasses, Mongoose `CastError`, duplicate key errors (`11000`), and unhandled exceptions. Returns a consistent `{ success, error: { code, message, details } }` JSON shape. |
| `requestContext.ts` | Uses Node.js `AsyncLocalStorage` to propagate per-request context (userId, roles, requestId) without passing it through every function. Consumed by `auditPlugin` and `softDeletePlugin` to auto-populate `createdBy`/`updatedBy`/`deletedBy`. |
| `scopeDepartment.ts` | Sets `req.departmentScope` based on the user's role: **superadmin** → `null` (sees all departments), **admin/HOD** → their own department ObjectId. Controllers use this to filter queries. Must run after `verifyToken` + `isAdmin`. |
| `validate.ts` | Takes a Zod schema and a source (`body`, `query`, or `params`). Parses the request data, throws `ValidationError` on failure, and replaces `req[source]` with the cleaned/typed data on success. |

## Middleware Chain Order (typical route)

```
verifyToken → isAdmin → scopeDepartment → validate → asyncHandler(controller)
                                                          ↓ (on error)
                                                     errorHandler
```
