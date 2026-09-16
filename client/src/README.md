# src/ — Client Source Root

All application source code for the Next.js frontend.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router — pages, layouts, and route segments. Defines the URL structure of the application. |
| `components/` | Reusable React components — `DashboardLayout`, `RoleGuard`, and shared UI primitives (`ui/`). |
| `context/` | React Context providers — `AuthContext` manages global authentication state (user, login, logout). |
| `hooks/` | Custom React hooks — `useDepartmentName` resolves a department ID to its display name via API. |
| `lib/` | Utility libraries — `api.ts` (Axios client with auto-auth), `firebase.ts` (Firebase app + auth initialization). |
| `types/` | TypeScript interfaces — mirrors server response shapes (`ApiResponse`, `IDepartment`, `ICourse`, etc.). |

## How They Connect

```
User visits page
  → app/layout.tsx wraps everything in AuthProvider + ToastProvider
  → Route matched in app/ directory
  → RoleGuard checks user.roles via AuthContext
  → DashboardLayout renders sidebar navigation based on roles
  → Page component fetches data via lib/api.ts (apiGet/apiPost/apiPut/apiDelete)
  → api.ts interceptor auto-attaches Firebase Bearer token
  → Response typed via types/api.ts interfaces
  → UI components (DataTable, FormModal, etc.) render the data
```
