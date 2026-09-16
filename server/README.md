# Server — AtlasAI Backend

Express.js + TypeScript REST API powering the AtlasAI academic management platform.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis (graceful fallback if unavailable)
- **Auth**: Firebase Admin SDK (JWT token verification + custom claims)
- **Validation**: Zod schemas
- **Logging**: Pino (with `pino-pretty` in dev)

## Entry Point Flow

1. `src/index.ts` — boots the server: connects MongoDB → connects Redis → starts Express listener.
2. `src/app.ts` — configures Express: CORS, JSON parsing, request-context middleware, registers all module routes, attaches global error handler.

## Architecture

```
server/
├── src/
│   ├── index.ts          # Server entry — DB + Redis + listen
│   ├── app.ts            # Express app setup + route registration
│   ├── config/           # External service configurations
│   ├── core/             # Shared infrastructure (middleware, plugins, utils, errors, types)
│   ├── middlewares/      # Auth middleware (Firebase token verification, role guards)
│   ├── models/           # Mongoose models shared across modules
│   ├── modules/          # Feature modules (controller → service → model pattern)
│   ├── routes/           # Legacy/top-level routes (admin, auth)
│   └── scripts/          # DB seed scripts
```

## How It Connects to the Client

The client (Next.js) sends HTTP requests to `/api/*` endpoints. Every request carries a Firebase `Bearer` token in the `Authorization` header. The server verifies it via `authMiddleware.ts`, resolves the user's roles from MongoDB, injects custom claims back into Firebase, then routes through role-scoped endpoints. The standardized `{ success, data, meta }` JSON response shape is consumed by the client's `apiClient` (Axios).
