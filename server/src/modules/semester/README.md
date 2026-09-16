# semester/ — Semester Module

Manages academic semesters/terms with date ranges and status tracking.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/semesters` | `admin+` | Create a semester |
| `PUT /:id` | `/api/semesters/:id` | `admin+` | Update a semester |
| `GET /` | `/api/semesters` | `admin+` (scoped) | List semesters (filterable by status, department) |
| `GET /:id` | `/api/semesters/:id` | any authenticated | Get semester by ID |
| `DELETE /:id` | `/api/semesters/:id` | `superadmin` | Soft-delete a semester |

## Schema Fields

`name` (unique per department), `department` (ref), `startDate`, `endDate`, `status` (`upcoming`/`active`/`completed`), `isActive`

## Connections

- **Belongs to**: `Department`.
- **Referenced by**: `CourseOffering.semester`, `SectionAssignment.semester`.
- **Client page**: `dashboard/admin/semesters/page.tsx`.
