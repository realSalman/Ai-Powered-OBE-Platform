# types/ — Shared Response Types

Defines the standardized API response shape used by every controller.

## Files

| File | Exports |
|------|---------|
| `response.ts` | `PaginationMeta` interface (`page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`), `ApiResponse<T>` interface (`success`, `data`, `meta?`), and `sendSuccess()` helper that wraps `res.status().json()`. |

## How It Connects

- **Controllers** call `sendSuccess(res, data, meta?, statusCode?)` to return consistent responses.
- **Client** mirrors this shape in `client/src/types/api.ts` (`ApiResponse<T>`, `PaginationMeta`) for type-safe consumption.
- **QueryBuilder** returns `{ data, meta }` from `.paginate()`, which controllers pass directly to `sendSuccess()`.
