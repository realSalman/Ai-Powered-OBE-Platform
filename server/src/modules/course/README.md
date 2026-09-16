# course/ — Course Module

Manages courses with Outcome-Based Education (OBE) support — course outcomes (COs), CO↔PO mapping, and exam templates.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/courses` | `admin+` | Create a course |
| `PUT /:id` | `/api/courses/:id` | `admin+` | Update a course |
| `GET /` | `/api/courses` | `admin+` (scoped) | List courses |
| `GET /:id` | `/api/courses/:id` | any authenticated | Get course by ID |
| `DELETE /:id` | `/api/courses/:id` | `superadmin` | Soft-delete a course |

## Schema Fields

`code`, `title`, `credits`, `type` (`theory`/`lab`/`project`), `department` (ref), `program` (optional ref), `courseOutcomes[]` (code + description + Bloom level), `coPoMapping[]` (CO→PO with weight 1-3), `examTemplates[]` (name + weight% + COs covered), `isActive`

## OBE Structure

```
Course
 ├── CourseOutcomes (CO1, CO2...) — each with Bloom taxonomy level
 ├── CO-PO Mapping — links COs to Program Outcomes with weights (1/2/3)
 └── ExamTemplates — define exam types with weight% and which COs they assess
```

## Connections

- **Belongs to**: `Department`, optionally `Program`.
- **Referenced by**: `CourseOffering.course`.
- **Client page**: `dashboard/admin/courses/page.tsx` (the largest admin page — full OBE form).
