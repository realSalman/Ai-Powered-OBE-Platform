# sections/ — Section Assignments Management Page

Route: `/dashboard/admin/sections`

CRUD interface for assigning students to sections within semesters and batches. Calls `GET/POST/PUT/DELETE /api/section-assignments`.

## Connections

- **Server module**: `server/src/modules/section-assignment/`
- **Depends on**: `User` (students), `Semester`, `Batch`, `Department` data for selectors.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
