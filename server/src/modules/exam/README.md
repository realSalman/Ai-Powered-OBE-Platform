# exam/ — Exam Module

Manages exam definitions with question-level CO mapping for OBE assessment.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/exams` | `admin+` | Create an exam |
| `PUT /:id` | `/api/exams/:id` | `admin+` | Update an exam |
| `GET /` | `/api/exams` | `admin+` (scoped) | List exams |
| `GET /:id` | `/api/exams/:id` | any authenticated | Get exam by ID |
| `DELETE /:id` | `/api/exams/:id` | `superadmin` | Soft-delete an exam |

## Schema Fields

`name`, `totalMarks`, `cosCovered[]` (which COs this exam assesses), `courseOffering` (ref), `questions[]` (number + marks + CO mapping), `isActive`

## Key Constraints

- Unique index on `{ courseOffering, name }` — no duplicate exam names per offering.

## Connections

- **Belongs to**: `CourseOffering`.
- **Implements**: The exam templates defined in `Course.examTemplates` at the offering level.
- **Client page**: `dashboard/admin/exams/page.tsx`.
