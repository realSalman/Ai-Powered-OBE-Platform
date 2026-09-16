# routes/ — Top-Level Routes

Route files that don't follow the modular pattern. These are mounted directly from `modules/index.ts`.

## Files

| File | Mount Path | Purpose |
|------|------------|---------|
| `authRoutes.ts` | `/api/auth` | Single endpoint: `POST /login`. Runs `verifyToken` middleware and returns the authenticated user data. This is the entry point the client calls after Google Sign-In. |
| `adminRoutes.ts` | `/api/admin` | User management: `POST /users` (create user with role, validated via Zod), `GET /users` (list users, filterable by role). Protected by `verifyToken` + `isAdmin` + `scopeDepartment`. Superadmin role cannot be assigned via API. |

## Connection to Other Modules

- `authRoutes` → triggers `verifyToken` from `middlewares/authMiddleware.ts` → sets custom claims in Firebase → returns user to client `AuthContext`.
- `adminRoutes` → uses `User` model from `models/User.ts`, `scopeDepartment` from `core/middleware/`, `validate` from `core/middleware/`, `ConflictError` from `core/errors/`.
- Client pages `dashboard/admin/page.tsx` and `dashboard/hod/page.tsx` call `GET /api/admin/users` to list users.
