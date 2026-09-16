# core/ — Shared Infrastructure

Reusable building blocks consumed by every feature module. Nothing in `core/` is domain-specific.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `errors/` | Custom `AppError` hierarchy — `NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`. All carry HTTP status codes and machine-readable error codes. Thrown by services, caught by `errorHandler`. |
| `middleware/` | Express middleware for request processing: async error wrapping, global error formatting, Zod validation, department scoping, and request-context (AsyncLocalStorage). |
| `plugins/` | Mongoose schema plugins that auto-inject fields: **auditPlugin** (createdBy/updatedBy) and **softDeletePlugin** (isDeleted/deletedAt/deletedBy with automatic query filtering). |
| `types/` | Shared TypeScript types — `ApiResponse<T>`, `PaginationMeta`, and the `sendSuccess()` response helper. |
| `utils/` | Utility functions — `cacheAside` (read-through cache pattern), `logger` (Pino), `QueryBuilder` (chainable filter/sort/search/paginate for Mongoose), `withTransaction` (MongoDB transaction with replica-set fallback). |

## How These Connect

- **Every module** uses `errors/` to throw, `middleware/asyncHandler` to catch, and `errorHandler` to format.
- **Every model** applies `auditPlugin` + `softDeletePlugin` from `plugins/`.
- **Every controller** calls `sendSuccess()` from `types/response.ts`.
- **Every service** uses `QueryBuilder` from `utils/` for list operations and `cacheAside` for cached reads.
- `requestContext` provides the current user ID (via `AsyncLocalStorage`) to audit/soft-delete plugins without prop-drilling.
