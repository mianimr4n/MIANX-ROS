# RC4 Production Cutover — Authorization (executed)

**GO received:** 2026-08-01 ~21:30 Asia/Karachi
**EXECUTE received (accepted):** 2026-08-01 **22:00** Asia/Karachi (earlier attempts outside window rejected)
**Window:** 2026-08-01 22:00 through 23:30 Asia/Karachi — **ACTIVE** at apply
**Operators:** Mian Imran (release / DB / rollback / smoke / T+60)

| Field | Value |
| --- | --- |
| Approved release SHA | `1d648950a8ea5bfb982713a203bacc6c7dd93ec1` |
| Project | `pyeowxvacgypohrbvgee` |
| Range | `20260731010000` → `20260801180000` (23) |
| Backup | `.local-backups/rc4-production-cutover/20260801-210850/` + hashes in BACKUP_VERIFICATION.md |

**Constraints honored:** linked ordered apply only; no ad-hoc SQL; no schema redesign.
