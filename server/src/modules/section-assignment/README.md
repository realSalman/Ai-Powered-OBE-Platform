# section-assignment/ — Section Assignment Module

Assigns students to sections within a semester and batch. A student can only be in one section per semester.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/section-assignments` | `admin+` | Create a section assignment |
| `PUT /:id` | `/api/section-assignments/:id` | `admin+` | Update an assignment |
| `GET /` | `/api/section-assignments` | `admin+` (scoped) | List assignments |
| `GET /:id` | `/api/section-assignments/:id` | any authenticated | Get assignment by ID |
| `DELETE /:id` | `/api/section-assignments/:id` | `superadmin` | Soft-delete an assignment |

## Schema Fields

`student` (User ref), `semester` (ref), `batch` (ref), `department` (ref), `section` (uppercase string)

## Key Constraints

- Unique index on `{ student, semester }` — one section per student per semester.
- Indexed on `{ semester, batch, section }` for fast section roster lookups.

## Connections

- **Links**: `User` (student) + `Semester` + `Batch` + `Department`.
- **Client pages**: `dashboard/admin/sections/page.tsx` (admin management), `dashboard/faculty/page.tsx` (faculty views assigned sections).
