# errors/ — Custom Error Classes

Defines a hierarchy of typed HTTP errors that services throw and `errorHandler` catches.

## Files

| File | Exports |
|------|---------|
| `index.ts` | `AppError` (base), `NotFoundError` (404), `ValidationError` (400), `ConflictError` (409), `ForbiddenError` (403), `UnauthorizedError` (401) |

## How It Works

- Services `throw new NotFoundError('Department', id)` instead of manually crafting error responses.
- `core/middleware/errorHandler.ts` catches any `AppError` instance and returns a standardized JSON: `{ success: false, error: { code, message, details } }`.
- Non-`AppError` exceptions (Mongoose `CastError`, duplicate key `11000`) are also handled.
- This keeps controllers free of error-formatting logic.

## Connection to Other Modules

- **Services** → throw these errors on business-rule violations.
- **errorHandler middleware** → catches and serializes them.
- **Client** → reads the `success: false` + `error.code` fields to display appropriate messages.
