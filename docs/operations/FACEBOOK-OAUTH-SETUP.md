# Facebook OAuth Setup — Telepizza Customer Login

## Overview

Telepizza uses Facebook Login via Supabase Auth for customer social sign-in.
The frontend never holds Facebook App credentials — all OAuth is mediated
through the Supabase Auth callback.

## Architecture

```
Customer → "Continue with Facebook" button
         → Supabase Auth signInWithOAuth({ provider: "facebook", scopes: "public_profile,email" })
         → Facebook Login Dialog (facebook.com)
         → Supabase callback (https://<project-ref>.supabase.co/auth/v1/callback)
         → Website /auth/callback
         → Session established, profile bootstrapped
```

## Requested Scopes

| Scope            | Purpose                          |
|------------------|----------------------------------|
| `public_profile` | Display name and avatar          |
| `email`          | Account identity / email match   |

**No additional permissions are requested.** Friends, photos, posts, birthday,
gender, location, and likes are explicitly forbidden in `auth-identity.ts`.

## Meta Developer Dashboard — Required Manual Steps

These settings must be configured in the
[Meta for Developers](https://developers.facebook.com/) dashboard:

### 1. Facebook App Settings → Basic

| Field              | Value                                            |
|--------------------|--------------------------------------------------|
| App Domains        | `<your-supabase-project-ref>.supabase.co`        |
| Privacy Policy URL | `https://telepizza.pk/privacy` (or actual URL)   |
| Terms of Service   | `https://telepizza.pk/terms` (or actual URL)     |

### 2. Facebook Login → Settings

| Field                         | Value                                                                                 |
|-------------------------------|---------------------------------------------------------------------------------------|
| Valid OAuth Redirect URIs     | `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`                    |
| Login with the JavaScript SDK | No (Supabase uses server-side OAuth flow)                                             |
| Enforce HTTPS                 | Yes                                                                                   |

For local development, also add:
```
http://localhost:54321/auth/v1/callback
```

### 3. Supabase Dashboard → Authentication → Providers → Facebook

| Field             | Value                                            |
|-------------------|--------------------------------------------------|
| Enabled           | Yes                                              |
| Facebook App ID   | From Meta dashboard → App Settings → Basic       |
| Facebook Secret   | From Meta dashboard → App Settings → Basic       |

### 4. App Review (Production)

For production use with non-developer accounts:

1. Submit the app for **App Review** in the Meta dashboard.
2. Request **public_profile** and **email** permissions (standard, no advanced).
3. Set the app to **Live** mode (Settings → Basic → App Mode).

Until the app is in Live mode, only users listed as Testers/Developers
in the Meta dashboard can complete Facebook Login.

## Verification Checklist

- [ ] Facebook App ID and Secret are entered in Supabase Auth → Facebook provider
- [ ] Valid OAuth Redirect URI matches `https://<ref>.supabase.co/auth/v1/callback`
- [ ] App Domains includes `<ref>.supabase.co`
- [ ] App is in Live mode (or test users are added for staging)
- [ ] Privacy Policy URL is set
- [ ] "Continue with Facebook" button navigates to `facebook.com` login dialog
- [ ] Callback returns to `/auth/callback` and session is created
- [ ] Scopes remain `public_profile,email` only

## Security Notes

- Facebook App Secret is stored only in Supabase Auth config, never in frontend code.
- The frontend passes `scopes: "public_profile,email"` — Supabase forwards this to Facebook.
- `auth-identity.ts` contains a guard (`facebookScopesAreMinimal`) tested in CI.
- No Graph API calls are made from the backend or frontend.
- Identity conflict (e.g., email already linked) is mapped to safe customer copy.
