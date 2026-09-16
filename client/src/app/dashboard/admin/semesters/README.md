# semesters/ — Semesters Management Page

Route: `/dashboard/admin/semesters`

CRUD interface for managing academic semesters. Calls `GET/POST/PUT/DELETE /api/semesters`.

## Connections

- **Server module**: `server/src/modules/semester/`
- **Depends on**: `Department` data for the department selector.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
