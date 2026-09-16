# config/ — External Service Configuration

Setup and connection logic for all external services the server depends on.

## Files

| File | Purpose | Connects To |
|------|---------|-------------|
| `env.ts` | Validates and exports environment variables using a **Zod schema**. All config values (`PORT`, `MONGO_URI`, `REDIS_URL`, `NODE_ENV`, `LOG_LEVEL`, `FIREBASE_SERVICE_ACCOUNT_PATH`) are type-safe and validated at startup. | Every other module reads from `env`. |
| `db.ts` | Connects to **MongoDB** via Mongoose. Configures connection pooling (`maxPoolSize: 50`, `minPoolSize: 10`). Exits the process on connection failure. | Used by `index.ts` at boot. All Mongoose models depend on this connection. |
| `firebase.ts` | Initializes **Firebase Admin SDK** with a service account key file. Used server-side to verify Firebase ID tokens and set custom claims. | Used by `middlewares/authMiddleware.ts` for JWT verification. |
| `redis.ts` | Creates a **Redis client** with graceful fallback — the app runs without cache if Redis is unavailable. Exports `cacheGet`, `cacheSet`, `cacheInvalidate` helpers. Default TTL is 300s. | Used by `core/utils/cacheAside.ts` and service layers for read-through caching and cache invalidation. |

## How These Connect

```
env.ts ──→ db.ts (MONGO_URI)
       ──→ firebase.ts (FIREBASE_SERVICE_ACCOUNT_PATH)
       ──→ redis.ts (REDIS_URL)
       ──→ logger.ts (LOG_LEVEL)
```

`index.ts` calls `connectDB()` and `connectRedis()` sequentially before starting the Express listener.
