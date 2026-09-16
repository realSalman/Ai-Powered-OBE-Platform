# utils/ — Shared Utility Functions

Helper utilities used across all service layers.

## Files

| File | Purpose | Used By |
|------|---------|---------|
| `cacheAside.ts` | Implements the **cache-aside** (read-through) pattern: check Redis first, if miss → execute `fetchFn()` → store result in Redis with a TTL. Returns cached or fresh data. | Service `findById` / `list` methods. |
| `logger.ts` | Creates a **Pino** logger instance. Uses `pino-pretty` with colorized output in development, raw JSON in production. Log level is configured via `env.LOG_LEVEL`. | `index.ts`, `errorHandler`, `withTransaction`, any module needing structured logs. |
| `queryBuilder.ts` | Chainable **QueryBuilder** class for Mongoose. Supports `.filter()` (auto-converts `gte/gt/lte/lt` to `$gte/$gt/$lte/$lt`), `.search()` (regex across specified fields), `.sort()`, `.select()`, `.populate()`, and `.paginate()` (returns `{ data, meta: PaginationMeta }`). | Every service's `list()` method. |
| `transaction.ts` | `withTransaction()` wrapper — starts a MongoDB session + transaction, commits on success, aborts on failure. **Gracefully falls back** to non-transactional execution if the MongoDB server doesn't support replica sets (standalone mode). | Service methods that need atomic multi-document writes. |

## How They Connect

```
Service.list()
  → new QueryBuilder(Model, req.query)
     .filter().search(['field']).sort().paginate()
  → returns { data, meta: PaginationMeta }

Service.findById()
  → cacheAside('key', ttl, () => Model.findById(id))
  → checks Redis → falls back to MongoDB

Service.create() with dependencies
  → withTransaction(async (session) => { ... })
  → atomic commit or fallback
```
