# offerings/ — Course Offerings Management Page

Route: `/dashboard/admin/offerings`

CRUD interface for creating course offerings — linking a course to a semester, batch, section, and teacher. Calls `GET/POST/PUT/DELETE /api/offerings`.

## Connections

- **Server module**: `server/src/modules/offering/`
- **Depends on**: `Course`, `Semester`, `Batch`, and `User` (faculty) data for dropdown selectors.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
