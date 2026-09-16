# department/ — Department Module

Manages academic departments (e.g., CSE, EEE, BBA).

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/departments` | `superadmin` | Create a department |
| `PUT /:id` | `/api/departments/:id` | `admin+` | Update a department |
| `GET /` | `/api/departments` | `admin+` (scoped) | List departments (paginated, searchable by code/name) |
| `GET /:id` | `/api/departments/:id` | any authenticated | Get department by ID |
| `DELETE /:id` | `/api/departments/:id` | `superadmin` | Soft-delete a department |

## Schema Fields

`code` (unique, uppercase), `name`, `hasPrograms`, `programOutcomes[]` (PO code + description), `isActive`

## Key Behaviors

- Department `code` uniqueness is enforced at both validator and service level.
- `findById` uses Redis cache-aside with 1-hour TTL.
- Create/update/delete invalidates `depts:*` and `dept:{id}` cache keys.
- Scoped admins can only see their own department via `scopeDepartment` middleware.

## Connections

- **Parent of**: Programs, Semesters, Batches, Courses, Offerings, SectionAssignments.
- **Referenced by**: `User.department` field.
- **Client pages**: `dashboard/admin/departments/page.tsx` provides the CRUD UI.
