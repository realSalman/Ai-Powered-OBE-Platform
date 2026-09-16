# hooks/ — Custom React Hooks

Reusable stateful logic extracted into hooks.

## Files

| File | Hook | Purpose |
|------|------|---------|
| `useDepartmentName.ts` | `useDepartmentName(departmentId?)` | Resolves a department MongoDB ObjectId to its display name and code. Calls `GET /api/departments/:id` via `apiGet`. Returns `{ name, code, loading, error }`. Handles missing IDs gracefully (returns "N/A"). |

## Connections

- **Uses**: `lib/api.ts` (`apiGet` function), `types/api.ts` (`IDepartment` interface).
- **Used by**: `dashboard/hod/page.tsx`, `dashboard/faculty/page.tsx`, `dashboard/student/page.tsx` — to show the department name in profile cards instead of raw ObjectIds.
