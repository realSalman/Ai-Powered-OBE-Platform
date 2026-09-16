# components/ — Reusable React Components

Shared UI components used across multiple pages.

## Files

| File | Component | Purpose |
|------|-----------|---------|
| `DashboardLayout.tsx` | `DashboardLayout` | Main layout wrapper for all dashboard pages. Renders a sidebar (desktop) or hamburger menu (mobile) with role-based navigation links. Shows user info card at bottom with sign-out button. Accepts a `title` prop for the page header. |
| `RoleGuard.tsx` | `RoleGuard` | Client-side access control. Accepts `allowedRoles` prop. Checks `user.roles` from `AuthContext` — if the user lacks the required role, redirects to `/dashboard` gateway. Shows a "verifying access" spinner while checking. |

## Subdirectory

| Directory | Purpose |
|-----------|---------|
| `ui/` | Low-level, generic UI primitives — `DataTable`, `FormModal`, `FormField`, `ConfirmDialog`, `Toast`. |

## How They Connect

```
app/layout.tsx → AuthProvider + ToastProvider (global)
  → RoleGuard (per route or layout — checks roles)
    → DashboardLayout (sidebar + header)
      → Page content using ui/* components (DataTable, FormModal, etc.)
```

- `DashboardLayout` reads `user.roles` from `AuthContext` to generate sidebar nav links.
- `RoleGuard` reads `user` and `loading` from `AuthContext` for gate logic.
