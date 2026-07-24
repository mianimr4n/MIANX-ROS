# RC1 Version Manifest

## Release identity

| Field | Value |
| --- | --- |
| Product | Telepizza Pakistan Platform |
| Platform brand | Mianx.ai |
| Release train | RC1 |
| Codename | Controlled Admin ERP Foundation |
| Documentation package | Commit G (`docs/rc1/`) |

## Git tip (product + quality)

| Ref | SHA |
| --- | --- |
| Commit F (quality) | `533887cbecda1525ad21f7d5b6b863657d0d2f1c` |
| Commit E (KDS) | `52e71798ea6396e766e6ba5254f7e4e1adb68896` |
| Commit D (Branch Manager) | `08dd85d12d0c834b7e324423fbe4df57550191ce` |
| Commit C (Owner ERP) | `ea29ad016e0a011eba76d318d0a6226118210e2c` |
| Commit B (Admin foundation) | `ac61c48555efd59a8912700ca69fc1328f74955a` |
| Commit A (Local infra) | `6a175fa36826c822b6e82e518901a305c2867af3` |

## Branch

`feature/admin-erp-foundation-s1`

## Package identity (unchanged by G)

| Package | Notes |
| --- | --- |
| Root `telepizza-platform` | Monorepo |
| `telepizza-pakistan` | Website app |
| `@telepizza/api` | Backend API |

Commit G **must not** bump versions or lockfiles. Any future semver tag (e.g. `rc1.0.0`) requires Founder tagging authorization.

## Artifact classes

| Class | Included in RC1 tip |
| --- | --- |
| Application source A–E | Yes (frozen commits) |
| Quality harnesses F | Yes |
| Release docs G | This package |
| `_tmp_*` scripts | No |
| Local roadmaps | No |
