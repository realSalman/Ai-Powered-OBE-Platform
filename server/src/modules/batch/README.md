# batch/ — Batch Module

Manages student batches (e.g., "Batch 60", "Batch 61") with section assignments.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/batches` | `admin+` | Create a batch |
| `PUT /:id` | `/api/batches/:id` | `admin+` | Update a batch |
| `GET /` | `/api/batches` | `admin+` (scoped) | List batches |
| `GET /:id` | `/api/batches/:id` | any authenticated | Get batch by ID |
| `DELETE /:id` | `/api/batches/:id` | `superadmin` | Soft-delete a batch |

## Schema Fields

`name`, `code` (unique per department), `department` (ref), `program` (optional ref), `sections[]` (string array, e.g., `["A", "B", "C"]`), `isActive`

## Connections

- **Belongs to**: `Department`, optionally `Program`.
- **Referenced by**: `CourseOffering.batch`, `SectionAssignment.batch`.
- **Client page**: `dashboard/admin/batches/page.tsx`.
