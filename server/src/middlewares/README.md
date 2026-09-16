# middlewares/ — Authentication Middleware

Firebase-based authentication and role-based access control middleware.

## Files

| File | Exports |
|------|---------|
| `authMiddleware.ts` | `AuthRequest` (extended Express Request with `user` and `firebaseUser`), `verifyToken`, `isAdmin`, `isSuperAdmin`, `isAdminOrHOD`, `requireRole` |

## How `verifyToken` Works

1. Extracts the `Bearer` token from `Authorization` header.
2. Calls `admin.auth().verifyIdToken(token)` to verify the Firebase JWT.
3. **Fast path**: if custom claims (`mongoUserId`, `roles`) already exist on the token, uses them directly (no DB hit).
4. **Slow path**: falls back to `User.findOne({ email })` in MongoDB, then calls `admin.auth().setCustomUserClaims()` to inject claims for future requests.
5. Populates `req.user` with `{ _id, email, roles, department, studentId, batch, teacherInitial }`.

## Role Guards

| Guard | Allows |
|-------|--------|
| `isAdmin` | `admin`, `superadmin` |
| `isSuperAdmin` | `superadmin` only |
| `isAdminOrHOD` | `admin`, `superadmin`, `HOD` |
| `requireRole(roles[])` | Any user whose roles intersect with the provided list |

## Connection to Other Modules

- Used by every protected route as the first middleware in the chain.
- `req.user` populated here is consumed by `scopeDepartment`, controllers, and (indirectly) by `requestContext` + audit plugins.
- The client-side `AuthContext` calls `POST /api/auth/login` with the Firebase token, which triggers `verifyToken`.
