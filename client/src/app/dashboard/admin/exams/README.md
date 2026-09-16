# exams/ — Exams Management Page

Route: `/dashboard/admin/exams`

CRUD interface for defining exams with question-level CO mapping. Calls `GET/POST/PUT/DELETE /api/exams`.

## Connections

- **Server module**: `server/src/modules/exam/`
- **Depends on**: `CourseOffering` data for the offering selector; course's COs for CO dropdown in questions.
- **Shared UI**: `DataTable`, `FormModal`, `ConfirmDialog`, `Toast`
