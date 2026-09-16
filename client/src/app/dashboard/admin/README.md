# admin/ — Admin Dashboard Pages

Route: `/dashboard/admin/*`

Full CRUD management interface for all academic entities. Protected by `RoleGuard` allowing only `admin` and `superadmin` roles.

## Files

| File | Route | Purpose |
|------|-------|---------|
| `layout.tsx` | — | Wraps all admin pages in `RoleGuard allowedRoles={["admin", "superadmin"]}`. |
| `page.tsx` | `/dashboard/admin` | **Admin home** — user creation form + user list table. Create users with role, department, studentId/teacherInitial. Calls `POST /api/admin/users` and `GET /api/admin/users`. |

## Subdirectories

Each subdirectory contains a single `page.tsx` providing a full CRUD interface (list table + create/edit modal + delete confirmation) for one entity:

| Directory | Route | Server API | Entity Managed |
|-----------|-------|------------|----------------|
| `departments/` | `/dashboard/admin/departments` | `/api/departments` | Academic departments |
| `programs/` | `/dashboard/admin/programs` | `/api/programs` | Degree programs |
| `semesters/` | `/dashboard/admin/semesters` | `/api/semesters` | Academic semesters |
| `batches/` | `/dashboard/admin/batches` | `/api/batches` | Student batches |
| `courses/` | `/dashboard/admin/courses` | `/api/courses` | Courses with OBE (COs, CO-PO, exam templates) |
| `offerings/` | `/dashboard/admin/offerings` | `/api/offerings` | Course offerings (course + semester + batch + teacher) |
| `sections/` | `/dashboard/admin/sections` | `/api/section-assignments` | Student section assignments |
| `enrollments/` | `/dashboard/admin/enrollments` | `/api/enrollments` | Student enrollments |
| `exams/` | `/dashboard/admin/exams` | `/api/exams` | Exam definitions |

## Shared UI Pattern

All admin CRUD pages follow the same pattern:
1. **DataTable** with search, pagination, edit/delete action buttons.
2. **FormModal** for create/edit operations.
3. **ConfirmDialog** for delete confirmation.
4. **Toast** notifications for success/error feedback.
5. Data fetched via `apiGet`, mutations via `apiPost`/`apiPut`/`apiDelete` from `lib/api.ts`.

## Connections

- **Uses**: `DashboardLayout`, `DataTable`, `FormModal`, `ConfirmDialog`, `useToast`.
- **Fetches from**: Server REST API endpoints via `apiClient`.
- **Auth**: Protected by `RoleGuard` (layout-level) + server-side `verifyToken` + `isAdmin`.
