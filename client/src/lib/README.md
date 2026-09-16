# lib/ — Utility Libraries

Core utility modules for API communication and Firebase setup.

## Files

| File | Purpose |
|------|---------|
| `firebase.ts` | Initializes the **Firebase client SDK**. Creates the Firebase app, `auth` instance, and `GoogleAuthProvider`. Exports an `isMock` flag that is `true` when `NEXT_PUBLIC_FIREBASE_API_KEY` is missing — this disables auth in development without Firebase configured. |
| `api.ts` | Creates an **Axios instance** (`apiClient`) pointing at `NEXT_PUBLIC_API_URL`. Adds a request interceptor that auto-attaches the Firebase Bearer token to every request. Exports typed helper functions: `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()` that return `ApiResponse<T>`. |

## How They Connect

```
firebase.ts → exports auth, isMock
    ↓
context/AuthContext.tsx → uses auth for onAuthStateChanged + signOut
    ↓
lib/api.ts → uses auth.currentUser.getIdToken() in request interceptor
    ↓
Every page → uses apiGet/apiPost/apiPut/apiDelete to call server endpoints
```

- `api.ts` depends on `firebase.ts` for the auth instance.
- `api.ts` depends on `types/api.ts` for the `ApiResponse<T>` type.
- All server communication flows through `apiClient`.
