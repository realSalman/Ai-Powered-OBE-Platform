# supervisor/ — Supervisor Dashboard Page

Route: `/dashboard/supervisor`

Dashboard for supervisors.

## What It Shows

1. **Profile card** — teacher initial and department.
2. **Section allocation info** — descriptive text about the supervisor's ability to allocate sections and assign students to groups.

## Connections

- **Auth**: Wrapped in `RoleGuard allowedRoles={["supervisor"]}`.
- **Layout**: Uses `DashboardLayout` for sidebar navigation.
- **Data**: Currently displays static profile info from `AuthContext` user data. No additional API calls.
