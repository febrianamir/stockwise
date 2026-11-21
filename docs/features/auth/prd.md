# User authentication: product requirements

**Status:** Implemented (v1)
**Module:** Authentication and account
**Apps:** `backend/` (API), `frontend/` (screens)
**Related:** [ERD](erd.md) · [Business rules](../../business/business-rules.md) · [Design system](../../design/design-system.md) · [UI guidelines](../../design/ui-guidelines.md)

## 1. Overview

People need an account before they can work in Stockwise. This feature covers the account itself, which belongs to a person, not to a company (business rules §2.4). Company memberships, roles and branch access build on it later.

Users can:

1. Register an account.
2. Verify their email address with a one-time code (OTP).
3. Log in.
4. Log out.
5. View their profile and verification status.
6. Update their personal information.
7. Change their password.
8. Recover a forgotten password with a one-time code.

## 2. Goals and non-goals

### Goals

- A simple, secure sign-up and sign-in flow for a single-page app.
- Proof of email ownership before the user can do business work.
- Recovery without contacting support.
- A foundation the company membership and permission system can build on.

### Non-goals (v1)

- Company creation, invitations, memberships, roles and branch access.
- Changing the email address.
- Social login, single sign-on and two-factor authentication.
- Deleting or deactivating an account. When added, it must respect MB-5 (no deleting the last owner of a company).
- Managing sessions on other devices, beyond revoking them on password change and reset.
- Audit trail entries (SEC-5). Auth events become audit candidates once the audit trail exists.

## 3. Users

Anyone who will use Stockwise: owners, admins, managers and cashiers. They all use the same account flow. Role-specific behaviour starts after login, once memberships exist.

## 4. Key decisions

| Topic | Decision |
| --- | --- |
| Authentication | Laravel Sanctum personal access tokens (bearer tokens). The SPA stores the token and sends it as `Authorization: Bearer <token>`. |
| Verification and recovery | A 6-digit numeric code sent by email. The same mechanism is used for both purposes. |
| Unverified users | Can log in. Until verified they can only verify, view and update their profile, change their password and log out. Business routes use the `verified` middleware and return `403`. |
| Email in local development | Delivered to Mailpit (`stockwise-mailpit`, inbox at http://localhost:8025). |

## 5. Rules

| ID | Rule |
| --- | --- |
| AUTH-1 | Email addresses are stored in lowercase and are unique across Stockwise. Login matches them case-insensitively. |
| AUTH-2 | Passwords are at least 8 characters and contain letters and numbers. They are stored only as hashes. |
| AUTH-3 | Registration creates an unverified account, logs the user in and emails a verification code. |
| AUTH-4 | A one-time code is 6 digits, valid for 10 minutes, and can be used once. Only a hash of the code is stored. |
| AUTH-5 | Issuing a new code for a purpose invalidates any earlier code for the same user and purpose. |
| AUTH-6 | A code allows at most 5 wrong attempts. After that it is invalid and the user must request a new one. |
| AUTH-7 | A new code can be requested at most once every 60 seconds per user and purpose. |
| AUTH-8 | Wrong or expired codes get the same error message, so the response doesn't reveal which. |
| AUTH-9 | Password recovery never reveals whether an account exists. "Forgot password" always answers the same way, and an unknown email in "reset password" gets the same error as a wrong code. |
| AUTH-10 | A successful password reset revokes every token for that user, and also verifies the email if it wasn't verified yet, since the code proves the user owns the inbox. |
| AUTH-11 | Changing the password requires the current password and revokes every other token. The current device stays logged in. |
| AUTH-12 | Logging out revokes only the token used for the request. |
| AUTH-13 | Login, registration, code requests and code checks are rate limited (see §7.3). |
| AUTH-14 | Unverified users get `403` from any route that requires a verified email. |
| AUTH-15 | Wrong login credentials get one generic message, and the response doesn't say whether the email exists. |

Known trade-off: registering with an email that is already taken returns a validation error, which confirms that the account exists. This is accepted for v1 because it is the clearest experience for users. Rate limiting reduces the risk of enumeration.

## 6. User flows

### 6.1 Register

1. On `/register` the user enters their name, email, password and password confirmation.
2. The API creates the account, returns a token and emails a verification code.
3. The app stores the token and opens `/verify-email`.

Errors: a taken email, a weak password or mismatched passwords are shown on the affected fields, and the user's input is kept.

### 6.2 Verify email

1. On `/verify-email` the user enters the 6-digit code from the email.
2. If the code is correct, the account is marked verified and the app opens `/profile` with a success toast.
3. "Resend code" sends a new code. The button shows a 60-second countdown after each send (AUTH-7).

Errors: a wrong or expired code shows "The code is invalid or has expired." After 5 wrong attempts the user must resend. A verified user who opens this page is redirected to `/profile`.

### 6.3 Log in

1. On `/login` the user enters their email and password.
2. If they are correct, the app stores the token. Unverified users go to `/verify-email`. Verified users go to the page they originally asked for, or `/profile`.

Errors: wrong credentials show one generic message. Too many attempts show the wait time.

### 6.4 Log out

From the user menu, "Log out" revokes the current token. The app clears its cached data and opens `/login`. The local session is cleared even if the API call fails.

### 6.5 View profile

`/profile` shows the user's name, email, phone and member-since date, plus the verification status: a "Verified" or "Not verified" badge with text. Unverified users also see a prompt linking to `/verify-email`.

### 6.6 Update personal information

The personal information form on `/profile` edits the name (required) and phone (optional). Saving shows a toast, and the page shows the updated values. The email is shown read-only.

### 6.7 Change password

The change password form on `/profile` asks for the current password, the new password and the confirmation. On success the form clears and a toast confirms the change. Other devices are logged out (AUTH-11).

### 6.8 Recover password

1. On `/forgot-password` the user enters their email. The app always moves on to `/reset-password?email=…` with the message "If an account exists for that email, we've sent a code." (AUTH-9)
2. On `/reset-password` the user enters the code, the new password and the confirmation.
3. On success the app opens `/login` with a toast asking the user to log in with the new password.

The reset screen also offers "Resend code", which repeats step 1.

## 7. API contract

Base URL: `/api/v1`. All requests and responses are JSON. The user object is `UserResource`.

```json
{
  "id": 1,
  "name": "Rina Putri",
  "email": "rina@example.com",
  "phone": "+62 812 3456 7890",
  "email_verified_at": "2026-11-21T08:30:00+00:00",
  "created_at": "2026-11-21T08:00:00+00:00",
  "updated_at": "2026-11-21T08:30:00+00:00"
}
```

### 7.1 Endpoints

| Method and path | Auth | Body | Success |
| --- | --- | --- | --- |
| `POST /auth/register` | No | `name`, `email`, `password`, `password_confirmation` | `201` `{ data: User, token }` |
| `POST /auth/login` | No | `email`, `password` | `200` `{ data: User, token }` |
| `POST /auth/logout` | Token | none | `204` |
| `POST /auth/email/verify` | Token | `code` | `200` `{ data: User }` |
| `POST /auth/email/resend` | Token | none | `202` `{ message }` |
| `POST /auth/password/forgot` | No | `email` | `202` `{ message }` |
| `POST /auth/password/reset` | No | `email`, `code`, `password`, `password_confirmation` | `204` |
| `GET /user` | Token | none | `200` `{ data: User }` |
| `PATCH /user` | Token | `name`, `phone` | `200` `{ data: User }` |
| `PUT /user/password` | Token | `current_password`, `password`, `password_confirmation` | `204` |

### 7.2 Errors

| Status | When | Body |
| --- | --- | --- |
| `401` | Missing, invalid or revoked token | `{ message: "Unauthenticated." }` |
| `403` | Unverified user on a route that requires a verified email | `{ message: "Your email address is not verified." }` |
| `422` | Validation failed, wrong credentials, or a wrong or expired code | `{ message, errors: { field: [..] } }` |
| `429` | Rate limit or resend cooldown hit | `{ message, retry_after }`, plus a `Retry-After` header |

Already verified users who call `POST /auth/email/verify` or `/auth/email/resend` get `422`, with the error on `code` and on `email` respectively.

### 7.3 Rate limits

| Limiter | Applies to | Limit | Keyed by |
| --- | --- | --- | --- |
| `login` | `POST /auth/login` | 5 per minute | email + IP |
| `register` | `POST /auth/register` | 10 per minute | IP |
| `otp-send` | `POST /auth/email/resend`, `POST /auth/password/forgot` | 3 per minute | user or email + IP |
| `otp-verify` | `POST /auth/email/verify`, `POST /auth/password/reset` | 10 per minute | user or email + IP |

The 60-second resend cooldown (AUTH-7) applies on top of these limits. For `/auth/email/resend` it returns `429` with `retry_after`. For `/auth/password/forgot` it is applied silently, because a `429` there would reveal that the account exists (AUTH-9).

## 8. Screens

| Route | Access | Purpose |
| --- | --- | --- |
| `/register` | Guests | Create an account |
| `/login` | Guests | Log in |
| `/forgot-password` | Guests | Request a recovery code |
| `/reset-password` | Guests | Enter the code and a new password |
| `/verify-email` | Logged in, unverified | Enter the verification code |
| `/profile` | Logged in | View the profile and verification status, update personal information, change the password |

`/` redirects to `/profile` until the dashboard exists. Logged-in users who open a guest page are redirected: unverified users to `/verify-email`, verified users to `/profile`. Guests who open a logged-in page are sent to `/login` and returned to that page after logging in. Logging out, a `401` or logging out in another tab sends every open page to `/login`.

Guest pages use a centred auth layout: the Stockwise wordmark and a card holding the form. Logged-in pages use a simple app header with the wordmark and a user menu (profile, log out). The full application shell with the sidebar and company and branch context arrives with the dashboard.

### UX copy

- Buttons: "Create account", "Log in", "Log out", "Verify email", "Resend code", "Send code", "Reset password", "Save changes", "Change password".
- Helper text for the code field: "Enter the 6-digit code we sent to {email}."
- Sentence case everywhere (design-system and CLAUDE.md).

## 9. States

- **Submitting:** the submit button is disabled and shows a spinner. Inputs keep their values.
- **Field errors:** shown under each field from the API's `errors`, and linked to the field with `aria-describedby`.
- **Form errors:** errors that aren't tied to a field, such as `429` or network failures, are shown in an alert at the top of the form.
- **Loading the session:** while the current user is loading, logged-in routes show a compact centred spinner.
- **Expired or revoked token:** any `401` clears the token and the cache, then redirects to `/login`.
- **Success:** a toast for routine actions (profile saved, password changed, code resent, email verified).

## 10. Acceptance criteria

### Backend

- [x] Register creates a user with a lowercased email, returns a token and queues a verification email.
- [x] Register rejects a taken email, weak passwords and mismatched confirmations.
- [x] Login returns a token for valid credentials, matching the email case-insensitively, and a generic `422` otherwise.
- [x] Logout revokes only the current token.
- [x] Verify accepts the latest valid code, sets `email_verified_at` and consumes the code.
- [x] Verify rejects wrong, expired, consumed and superseded codes, and invalidates a code after 5 wrong attempts.
- [x] Resend issues a new code and enforces the 60-second cooldown.
- [x] Forgot password answers the same way for known and unknown emails and only sends email to known accounts.
- [x] Reset sets the new password, revokes every token, verifies the email and consumes the code.
- [x] Profile update changes only the name and phone.
- [x] Password change checks the current password, revokes the other tokens and keeps the current one.
- [x] Routes with the `verified` middleware return `403` to unverified users.
- [x] Rate limits return `429`.

### Frontend

- [x] Every flow in §6 works end to end against the API.
- [x] Route guards redirect as described in §8.
- [x] Field errors, form errors, submitting and success states work as described in §9.
- [x] The design tokens, sentence case and accessible labels follow the design docs.
- [x] Verified in the browser on desktop and mobile with no console errors.

## 11. Open questions

1. **Token lifetime.** Tokens don't expire yet (`sanctum.expiration` is `null`). Should they expire, for example after 30 days, and should an inactive cashier device be logged out sooner?
2. **Email change.** When it's added, should the new address be verified with a code before it replaces the old one?
3. **Audit events.** Which auth events go to the audit trail (SEC-5): logins, failed logins, password changes and resets?
4. **Cashier devices.** Do shared POS terminals need a faster cashier switch, such as a PIN, instead of a full email and password login?
