# Backup re-attestation (pre-mutation)

**At:** 2026-08-01 22:00 Asia/Karachi
**Directory:** `.local-backups/rc4-production-cutover/20260801-210850/`

| File | Bytes | SHA-256 | Match recorded |
| --- | ---: | --- | --- |
| `01-roles.sql` | 297 | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` | YES |
| `02-schema.sql` | 503729 | `8F0E7ACC5A9BB1E1738E3E6BFF304D6CAB0C21E9D20232A3EEC994BC3B47ED72` | YES |
| `03-data.sql` | 435404 | `DC21EC70CD3B145B94E562B7DE1D61054AF3A9EAF14A0D2D3D3ACF01B9197699` | YES |

Gitignored: YES (`git check-ignore`). Restore instructions: BACKUP_VERIFICATION.md.
**Result:** PASS — proceed to apply.
