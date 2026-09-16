# student/ — Student Dashboard Page

Route: `/dashboard/student`

Dashboard for students.

## What It Shows

1. **Profile card** — student ID, batch, and department name.
2. **Enrolled courses table** — lists the student's course enrollments with status badges (`ACTIVE`/`DROPPED`). Fetched from `GET /api/enrollments/me`.

## Connections

- **Auth**: Wrapped in `RoleGuard allowedRoles={["student"]}`.
- **Layout**: Uses `DashboardLayout` for sidebar navigation.
- **Server endpoints**: `GET /api/enrollments/me` (student-specific endpoint returning their enrollments).
- **Hooks**: `useDepartmentName` to resolve department ObjectId to name.
