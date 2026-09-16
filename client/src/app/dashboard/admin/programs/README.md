# programs/ — Programs Management Page

Route: `/dashboard/admin/programs`

CRUD interface for managing degree programs. Loads departments as dropdown options. Calls `GET/POST/PUT/DELETE /api/programs`.

## Connections

- **Server module**: `server/src/modules/program/`
- **Depends on**: `Department` data for the department selector dropdown.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
