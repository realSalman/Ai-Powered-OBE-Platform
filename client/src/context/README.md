# context/ — React Context Providers

Global state management via React Context API.

## Files

| File | Provider | Purpose |
|------|----------|---------|
| `AuthContext.tsx` | `AuthProvider` + `useAuth` | Manages global authentication state. Tracks `user` (app-level user data from server), `firebaseUser` (Firebase Auth user), and `loading` state. Provides `login(token)` and `logout()` functions. |

## How It Works

1. **On mount**: Listens to `onAuthStateChanged` from Firebase. If a Firebase user is detected, auto-fetches the ID token and calls `login()`.
2. **`login(token)`**: Sends `POST /api/auth/login` with the Bearer token → server verifies token, returns user data → stored in state. Then force-refreshes the Firebase token to pick up newly injected custom claims.
3. **`logout()`**: Calls `auth.signOut()` and clears user state.
4. **Mock mode**: If Firebase env vars are missing (`isMock = true`), skips auth entirely — useful for development without Firebase configured.

## Connections

- **Mounted in**: `app/layout.tsx` (wraps entire app).
- **Consumed by**: Every page/component that needs auth state — `useAuth()` hook.
- **Depends on**: `lib/firebase.ts` (Firebase auth instance), `lib/api.ts` (API URL for login).
- **Server endpoint**: `POST /api/auth/login` via `routes/authRoutes.ts`.
