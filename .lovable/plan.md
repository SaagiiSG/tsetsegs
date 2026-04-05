

## Registration Approval Queue + Deferred Device Lock

### The Problems

1. **Past students can't register** — they aren't in the `students` table, and there's no paper trail to bulk-import. Invite codes won't work because students would share them with non-students.

2. **Instagram browser device lock** — students register in Instagram's in-app browser, which gets locked as their device. Then they can't log in from their real browser.

### Solution

**Problem 1: Admin Approval Queue**

Anyone can submit a registration request (phone + name), but it goes into a **pending queue** instead of creating an account immediately. You (the admin/teacher) see the list of pending requests in the dashboard and approve or reject each one. Only approved requests become real student accounts.

- You share the platform link in your Instagram group — students fill in their info
- You see "5 pending registrations" in your admin dashboard
- You recognize the names, tap approve — done
- Random people who aren't your students? Reject or ignore

This is un-shareable — knowing the link doesn't help because every request needs your personal approval.

**Problem 2: Defer Device Lock**

Currently the device ID is saved the moment the account is created (line 338-340), before the student even sets a password. We'll remove that and only lock the device on the first password login (line 505-514 already handles this case). So: register in Instagram browser → close it → log in from Safari → Safari becomes the locked device.

### Technical Plan

**1. New table: `registration_requests`**

```
id           uuid (PK)
phone_number text (unique among pending)
full_name    text
status       text ('pending' | 'approved' | 'rejected')
batch_id     uuid (nullable, admin assigns on approval)
reviewed_by  uuid (nullable, admin who approved/rejected)
reviewed_at  timestamptz
created_at   timestamptz
```

RLS: Anyone can INSERT (for the request). Only admins can SELECT/UPDATE.

**2. Update login flow (`StudentAuthContext.tsx`)**

- When phone is not found in `student_accounts` AND not found in `students`: instead of auto-creating an account, check `registration_requests`
  - If a pending request exists → show "Your request is pending approval"
  - If no request exists → show the registration request form (name + phone)
  - If approved → proceed normally (account creation)
- Remove `registered_device_id` and `device_registered_at` from the initial account insert (lines 338-340)

**3. Update `StudentPortal.tsx`**

- Add a new auth step: `'request_registration'` — shown when phone isn't found
  - Form: full name input + submit button
  - On submit: inserts into `registration_requests`
- Add a new state: `'pending_approval'` — shown after submitting or if request already pending
  - Simple message: "Your request has been submitted. You'll be able to log in once approved."

**4. New admin component: `RegistrationQueue.tsx`**

- Shows pending registration requests with name, phone, timestamp
- Approve button: creates the student in `students` table (and optionally assigns to a batch), marks request as approved
- Reject button: marks as rejected
- Add a notification badge in the admin sidebar showing pending count

**5. Files to create/modify**

- **New migration**: `registration_requests` table + RLS
- **New**: `src/components/admin/RegistrationQueue.tsx`
- **Modify**: `src/contexts/StudentAuthContext.tsx` — new auth steps, remove device ID from insert
- **Modify**: `src/pages/StudentPortal.tsx` — new request/pending UI steps
- **Modify**: `src/components/admin/AdminSidebar.tsx` — add queue link with badge
- **Modify**: Admin page to include the queue section

