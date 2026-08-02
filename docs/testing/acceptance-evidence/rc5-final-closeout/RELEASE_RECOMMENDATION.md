# RC5 release recommendation

## Current released tag

| Field | Value |
| --- | --- |
| Tag | `v1.3.0` |
| Type | Annotated git tag |
| Target commit | `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` |
| GitHub Release | **Does not exist** |

## Proposed next version

| Field | Recommendation |
| --- | --- |
| Version | `v1.4.0` |
| Tag type | Annotated |
| Target strategy | Tag the **final closeout merge commit** on `main` (includes certified documentation), not only the pre-closeout runtime SHA `152ce40…`, if Founder wants docs in the release tip |
| Proposed message | `RC5: certification closeout — website Production at 152ce40; optional slices complete.` |
| Create in this PR? | **No** — documentation only |
| Push tag in this PR? | **No** |
| Create GitHub Release? | **No** (optional later; none exists today for `v1.3.0`) |

## Rationale

RC5 delivered repository slices plus evidenced Production website cutover after `v1.3.0`. A minor SemVer bump (`v1.4.0`) fits convention for post-RC4 certified hardening without inventing a major version. Package.json app versions remain divergent (TD-3) and are not silently rewritten by this recommendation.

## Authorization

Founder must explicitly authorize tag creation/push after closeout merge. This document is recommendation-only.
