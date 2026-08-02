# Freshness, retention, degraded states

| State | UI behavior |
| --- | --- |
| No supported events | Honest empty: “No supported activity events were found for this window.” |
| No comparable baseline | NO_BASELINE; prompt to mark reviewed |
| Baseline branch/window mismatch | INSUFFICIENT; reset baseline |
| Source unavailable / partial | Name domains; lower confidence; never “No changes” |
| Total source failure | Explicit failure copy; not empty-day claim |
| Retention / incomplete audit | Limitations state lists are not a complete audit stream |
| Permission-restricted finance | Omitted + listed |

No new polling. Manual refresh / existing retry only.
