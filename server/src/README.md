# Server — AtlasAI Backend


## Files

| File | Purpose |
|------|---------|
| `index.ts` | Application entry point. Sequentially connects MongoDB, Redis, then starts the Express HTTP listener on the configured port. |
| `app.ts` | Creates the Express app, applies global middleware (CORS, JSON body parser, request context), registers all module routes via `modules/index.ts`, and mounts the global error handler last. |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `config/` | External service setup — MongoDB, Redis, Firebase Admin, environment variable validation. |
| `core/` | Shared infrastructure — custom errors, reusable middleware, Mongoose plugins, utility helpers, response types. |
| `middlewares/` | Request-level auth middleware — Firebase token verification and role-based access guards. |
| `models/` | Mongoose models shared across modules (currently `User`). |
| `modules/` | Feature modules. Each module is self-contained with its own model, service, controller, routes, types, and validator. |
| `routes/` | Top-level route files (`authRoutes`, `adminRoutes`) that don't follow the module pattern. |
| `scripts/` | Database seed script for populating initial data. |

## Request Lifecycle

```
HTTP Request
  → CORS + JSON parse
  → contextMiddleware (assigns requestId, userId via AsyncLocalStorage)
  → Route matched in modules/index.ts
  → verifyToken (Firebase JWT check, user lookup/claim sync)
  → Role guard (isAdmin / isSuperAdmin / requireRole)
  → scopeDepartment (restrict data by department for scoped admins)
  → validate (Zod schema on body/query/params)
  → asyncHandler → Controller → Service → Model/DB
  → sendSuccess() or throw AppError
  → errorHandler (catches and formats all errors)
```
