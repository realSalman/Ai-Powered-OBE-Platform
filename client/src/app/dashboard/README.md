# dashboard/ — Dashboard Area

Route: `/dashboard/*`

Protected area requiring authentication. All sub-pages are role-gated.

## Files

| File | Route | Purpose |
|------|-------|---------|
| `page.tsx` | `/dashboard` | **Gateway page** — auto-redirects the user to their role-specific dashboard: `admin` → `/dashboard/admin`, `hod` → `/dashboard/hod`, `faculty` → `/dashboard/faculty`, `student` → `/dashboard/student`, `supervisor` → `/dashboard/supervisor`. Shows a loading spinner during redirect. |

## Subdirectories

| Directory | Route | Roles | Purpose |
|-----------|-------|-------|---------|
| `admin/` | `/dashboard/admin/*` | `admin`, `superadmin` | Full CRUD management for all academic entities. |
| `hod/` | `/dashboard/hod` | `HOD` | Department head profile + department faculty list. |
| `faculty/` | `/dashboard/faculty` | `faculty` | Faculty profile + assigned sections/courses. |
| `student/` | `/dashboard/student` | `student` | Student profile + enrolled courses. |
| `supervisor/` | `/dashboard/supervisor` | `supervisor` | Supervisor profile + section allocation info. |

## Role Priority for Redirect

If a user has multiple roles, the gateway picks the highest-priority one:
`admin` > `hod` > `supervisor` > `faculty` > `student`

## Connections

- All sub-pages use `DashboardLayout` (sidebar + header) and `RoleGuard` (access control).
- The gateway reads `user.roles` from `AuthContext` to determine redirect target.
