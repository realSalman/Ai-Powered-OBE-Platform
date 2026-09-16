# courses/ — Courses Management Page

Route: `/dashboard/admin/courses`

The most complex admin page. Full CRUD with OBE (Outcome-Based Education) support:
- Course Outcomes (COs) with Bloom taxonomy levels
- CO↔PO mappings with weights (1/2/3)
- Exam templates with weight% and CO coverage

Calls `GET/POST/PUT/DELETE /api/courses`.

## Connections

- **Server module**: `server/src/modules/course/`
- **Depends on**: `Department`, `Program` data for dropdowns; `Department.programOutcomes` for PO references in CO-PO mapping.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
