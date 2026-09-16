# program/ — Program Module

Manages degree programs within departments (e.g., B.Sc. CSE, M.Sc. EEE).

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/programs` | `admin+` | Create a program |
| `PUT /:id` | `/api/programs/:id` | `admin+` | Update a program |
| `GET /` | `/api/programs` | `admin+` (scoped) | List programs (filterable by department) |
| `GET /:id` | `/api/programs/:id` | any authenticated | Get program by ID |
| `DELETE /:id` | `/api/programs/:id` | `superadmin` | Soft-delete a program |

## Schema Fields

`code` (unique per department, uppercase), `name`, `department` (ref), `programOutcomes[]`, `isActive`

## Connections

- **Belongs to**: `Department` (required).
- **Referenced by**: `Batch.program`, `Course.program`.
- **Client page**: `dashboard/admin/programs/page.tsx`.
