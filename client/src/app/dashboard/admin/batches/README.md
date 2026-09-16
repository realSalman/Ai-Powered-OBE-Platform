# batches/ — Batches Management Page

Route: `/dashboard/admin/batches`

CRUD interface for managing student batches with section lists. Calls `GET/POST/PUT/DELETE /api/batches`.

## Connections

- **Server module**: `server/src/modules/batch/`
- **Depends on**: `Department` and `Program` data for dropdown selectors.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
