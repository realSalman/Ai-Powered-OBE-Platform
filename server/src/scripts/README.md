# scripts/ — Database Scripts

Utility scripts for database management.

## Files

| File | Purpose |
|------|---------|
| `seed.ts` | Seeds the MongoDB database with initial data — departments, programs, semesters, batches, courses, users, offerings, enrollments, and exams. Useful for development/testing. |

## How to Run

```bash
npx ts-node src/scripts/seed.ts
```

## Connection to Other Modules

- Directly imports and creates documents using all Mongoose models from `modules/` and `models/`.
- Requires a valid MongoDB connection (reads `MONGO_URI` from env).
