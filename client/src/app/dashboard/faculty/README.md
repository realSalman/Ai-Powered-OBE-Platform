# faculty/ — Faculty Dashboard Page

Route: `/dashboard/faculty`

Dashboard for faculty members.

## What It Shows

1. **Profile card** — teacher initial and department name.
2. **Assigned sections table** — lists course offerings assigned to this faculty member. Fetched from `GET /api/section-assignments/me`.

## Connections

- **Auth**: Wrapped in `RoleGuard allowedRoles={["faculty"]}`.
- **Layout**: Uses `DashboardLayout` for sidebar navigation.
- **Server endpoints**: `GET /api/section-assignments/me` (faculty-specific endpoint returning their assigned sections).
- **Hooks**: `useDepartmentName` to resolve department ObjectId to name.
