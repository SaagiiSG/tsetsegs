

## Analysis

The current device lock system already stores a UUID in `localStorage` (`student_device_id`). localStorage **does** persist across tab closes — it only gets cleared if the student manually clears browser data, uses incognito mode, or a browser cleanup tool runs.

The previous fix added `bypassDeviceLock` so password-authenticated logins re-register the device automatically. This means even if localStorage gets cleared, the student can still log in with their password and the device gets re-registered.

### What's actually happening when "closing a tab locks them out"

Looking at `checkExistingSession()` (line 84-108): when a student reopens the site, it checks `student_session_id` and `student_id` from localStorage, then verifies the session in the `student_sessions` table. If the session expired or was deactivated (due to single-session enforcement), the student lands on the login screen. From there, they enter their phone → password → `bypassDeviceLock=true` re-registers the device. **This should already work.**

### Proposed improvements to make it more robust

1. **Add a browser fingerprint fallback** — combine multiple browser signals (screen resolution, timezone, language, platform) into a secondary identifier stored alongside the UUID. If localStorage is cleared but the fingerprint matches, recognize the device without triggering a lock.

2. **Store device ID redundantly** — use both `localStorage` and `IndexedDB` so clearing one doesn't lose the ID. On `getDeviceId()`, check both and restore whichever is missing.

3. **Soften the lock on session restore failure** — when `checkExistingSession` fails but the device ID still matches the registered one, skip straight to the password step instead of showing "device locked" error.

### Files to modify

- **`src/contexts/StudentAuthContext.tsx`**:
  - Update `getDeviceId()` to read/write from both `localStorage` and `IndexedDB`
  - Add a lightweight browser fingerprint (hash of navigator properties) as a secondary match
  - On `completeLogin`, store fingerprint in `student_accounts` alongside `registered_device_id`
  - When device ID doesn't match but fingerprint does, treat it as same device and re-register the UUID

### Database change

- Migration to add `device_fingerprint` column (nullable text) to `student_accounts`

### Technical detail

The fingerprint would be a simple hash of: `navigator.userAgent + screen.width + screen.height + Intl.DateTimeFormat().resolvedOptions().timeZone + navigator.language`. This isn't meant to be a tracking fingerprint — just enough to recognize "same browser on same computer" when localStorage gets wiped.

