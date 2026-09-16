# enrollments/ — Student Enrollments Management Page

Route: `/dashboard/admin/enrollments`

CRUD interface for enrolling students in course offerings. Calls `GET/POST/PUT/DELETE /api/enrollments`.

## Connections

- **Server module**: `server/src/modules/enrollment/`
- **Depends on**: `User` (students) and `CourseOffering` data for selectors.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
