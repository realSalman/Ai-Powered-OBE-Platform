# hod/ — HOD Dashboard Page

Route: `/dashboard/hod`

Dashboard for Department Heads (HOD role).

## What It Shows

1. **Profile card** — teacher initial and department name (resolved via `useDepartmentName` hook).
2. **Department faculty table** — lists all faculty members in the HOD's department. Fetched from `GET /api/admin/users?role=faculty`.

## Connections

- **Auth**: Wrapped in `RoleGuard allowedRoles={["HOD"]}`.
- **Layout**: Uses `DashboardLayout` for sidebar navigation.
- **Server endpoints**: `GET /api/admin/users` (filtered by role and department via `scopeDepartment`).
- **Hooks**: `useDepartmentName` to resolve department ObjectId to name.
