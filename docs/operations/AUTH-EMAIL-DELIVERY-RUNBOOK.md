# Auth email delivery runbook (customer confirmation)

Operations checklist when customers report missing signup confirmation emails.

**Scope:** Supabase Auth email confirmation for customer email/password signup.  
**Do not** commit SMTP passwords, API keys, or dashboard secrets to this repository.

> **Owner required (app cannot fix delivery):** Configure custom SMTP + SPF/DKIM/DMARC on your sender domain, then verify Redirect URLs include `/auth/callback`. Until that is done, confirmation emails may never arrive or land in spam even when the website UX (Account Created / Resend / Open Gmail) works correctly.

---

## Owner go-live checklist (copy this)

- [ ] Custom SMTP enabled in Supabase Auth (not default mailer alone)
- [ ] Sender domain verified with provider
- [ ] SPF DNS record published
- [ ] DKIM DNS records published and verified
- [ ] DMARC policy published
- [ ] Site URL = production website origin
- [ ] Redirect URLs include production + local `/auth/callback`
- [ ] Test signup to a fresh mailbox; Auth Logs show send success
- [ ] No SMTP credentials stored in git

---

## 1. Expected product behavior

| Step | Behavior |
|---|---|
| Signup | Website calls `supabase.auth.signUp` with `emailRedirectTo` → `{origin}/auth/callback` |
| Confirmation required | No session until email is confirmed; UI shows **Account Created**, the email address, Resend Email, and Open Gmail |
| Resend | Rate-limited “Resend Email” via `supabase.auth.resend({ type: "signup" })` (client cooldown ~60s) |
| Login before confirm | Sign-in fails with a safe “confirm your email” message — never reported as logged in |
| Google OAuth | Separate path — no confirmation email; never asks for a Google password |

Safe confirmation copy (website):

> Account Created — We sent a confirmation link to {email}. Didn’t receive it? Resend Email / Open Gmail.

Application code **cannot** fix SMTP delivery. If Auth Logs show a successful send and the customer still has nothing, treat it as provider/DNS reputation (§4–§5).

---

## 2. Supabase Auth Logs check

1. Open Supabase Dashboard → project → **Authentication** → **Logs** (or **Logs** → Auth).
2. Filter around the customer signup / resend timestamp.
3. Look for:
   - `user_confirmation_requested` / signup events
   - mailer / SMTP send success vs failure
   - `over_email_send_rate_limit` / 429-class errors
4. If Auth never attempted a send, fix signup configuration (confirm email enabled, redirect allowlist) before blaming SMTP.
5. If Auth attempted send and SMTP failed, continue to §4–§5.

---

## 3. Spam / All Mail check (customer)

Ask the customer to check:

1. Inbox for the Supabase / branded sender
2. **Spam / Junk**
3. **All Mail** / Promotions (Gmail)
4. Correct address (typos)
5. Use **Open Gmail** on the Account Created screen when they use Gmail

Do **not** tell the customer whether another arbitrary email exists in the system.

---

## 4. Custom SMTP required for production

Supabase **default** mailer is for development / low volume. It is rate-limited and not suitable as the sole production confirmation path.

**Owner action (dashboard checklist):**

- [ ] Authentication → **SMTP Settings** (or Project Settings → Auth → SMTP)
- [ ] Production provider configured (Resend, Postmark, SendGrid, Amazon SES, etc.)
- [ ] Verified sender domain (see §5)
- [ ] Test confirmation sent from a fresh test mailbox
- [ ] Auth Logs show SMTP send success (not default-mailer throttling)

Never paste SMTP credentials into git, PR descriptions, or chat logs that are committed.

---

## 5. Sender-domain requirements (SPF / DKIM / DMARC)

| Requirement | Checklist | Why |
|---|---|---|
| SPF | [ ] TXT record authorizes the SMTP provider | Authorizes the provider to send for your domain |
| DKIM | [ ] Provider DKIM keys published and verified | Cryptographic signature; reduces spam scoring |
| DMARC | [ ] `_dmarc` policy aligned with From domain | Policy alignment for the From domain |
| Matching From domain | [ ] Prefer `noreply@yourdomain` over shared Supabase default | Consistent branding + deliverability |

Until DNS is verified, confirmation mail may land in spam or be dropped. The website cannot work around this.

---

## 6. Rate-limit checks

Symptoms:

- UI: “Too many email requests…”
- Auth logs: `over_email_send_rate_limit` / similar

Actions:

1. Wait for the provider / Supabase cooldown window
2. Confirm custom SMTP is enabled (default mailer limits are stricter)
3. Avoid automated resend loops in tests against production
4. Website enforces a client cooldown on Resend Email; do not remove it to “fix” delivery

---

## 7. Resend test (safe)

1. Register a **new** test mailbox you control (or use plus-addressing).
2. Confirm UI shows **Account Created** with the email address (no auto-login when confirmation is required).
3. Wait for the Resend cooldown, then click **Resend Email**.
4. Optionally click **Open Gmail** and confirm the message arrived (inbox or spam).
5. Open the link → lands on `/auth/callback` → session established → safe internal redirect.
6. Confirm Auth Logs show the resend attempt.

---

## 8. Confirmation callback / redirect URLs

| Check | Expected |
|---|---|
| Site URL | Production website origin (e.g. `https://telepizza-website.vercel.app`) |
| Redirect URLs | Include `https://telepizza-website.vercel.app/auth/callback` and local `http://localhost:3000/auth/callback` (and `:5173` if used) |
| Link in email | Points at allowlisted `/auth/callback` (or Supabase verify URL that redirects there) |
| Callback page | Handles PKCE / session; maps cancel/errors safely; never open-redirects |
| `emailRedirectTo` | Website always sets confirmation + resend redirect to `/auth/callback` |

Website helpers: `getEmailConfirmationRedirectTo()` / `getGoogleOAuthRedirectTo()` in `apps/website/client/src/lib/auth-redirect.ts`.

---

## 9. Root-cause triage (quick)

| Observation | Likely cause | Owner action |
|---|---|---|
| No Auth log send | Confirm-email disabled / wrong project | Enable confirmations; verify project ref |
| Send attempted, customer empty + spam empty | Default SMTP / domain reputation | Custom SMTP + DNS (§4–§5) |
| Rate-limit errors | Too many sends / default mailer | Wait; move to custom SMTP |
| Link opens but session fails | Redirect URL not allowlisted / wrong Site URL | Fix Redirect URLs + Site URL |
| Customer already confirmed | Resend may no-op | Ask them to sign in; keep messages generic |

---

## 10. Secrets policy

- **Never** commit SMTP host/user/password, webhook secrets, or service-role keys.
- Store credentials only in the Supabase dashboard (or the org secret store).
- Rotate credentials if they appear in chat, tickets, or CI logs.
