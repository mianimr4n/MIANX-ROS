# Provider State Model

## States

`queued` · `suppressed` · `submitted` · `provider_accepted` · `provider_rejected` · `failed` · `delivered` · `opened` · `clicked`

## Adapters

Email + WhatsApp adapters:

- `providerConfigured: false`
- `submit()` returns `queued` with `deliveryClaimed: false`
- `mapProviderState("delivered"|"opened"|"clicked")` → `null` without confirmation payload

## Elevation

`applyConfirmedProviderEvent` requires `confirmed=true` and `providerMessageId` before elevating to delivered/opened/clicked.

SMS/push: no supported provider — channel remains unconfigured.
