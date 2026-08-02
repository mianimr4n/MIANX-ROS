# Since-anchor decision

| Candidate | Decision |
| --- | --- |
| Previous successful login | **Rejected** — `users.last_login_at` not written; Auth `last_sign_in_at` not Owner Command Center watermark |
| Current session start | Not used as personalized “since” claim |
| Last dashboard review (this device) | **Primary when baseline exists** |
| User-selected timestamp | Deferred |
| Start of branch business day | Fallback window label when no baseline |

## Exact Owner wording

- With comparable baseline: **“Since your last review on this device”**
- Without baseline: **“Changes during the selected business window”**

Forbidden: “Since your last login”, “Since your previous successful sign-in”.
