# Representative route adoption

| Route | Adoption | Notes |
| --- | --- | --- |
| Owner dashboard | `AdminDataState` coming-soon / not-operating | POLISH-02 hierarchy preserved |
| Orders | `FILTERED_EMPTY` + `AdminErrorState` in OrderGrid | Ops header from POLISH-03 unchanged |
| Delivery | `NO_ACTIVITY_YET` on DispatchQueue + DeliveryCards | Ops deferred note → capability notice |
| Floor | `CONFIGURATION_REQUIRED` | |
| Inventory | `AdminCapabilityNotice` deferred | |
| Purchasing | `AdminCapabilityNotice` deferred | |
| CRM | `AdminCapabilityNotice` VIP/blocked | |
| HR | `AdminCapabilityNotice` deferred performance/training | |
| Finance | `AdminCapabilityNotice` Foundation/Deferred | operational vs Posted truth unchanged |
| Reports | `AdminCapabilityNotice` deferred | |
| Settings | readiness banner + deferred capability notice | POLISH-04 presentation preserved |
| Section titles | Brand-red eyebrow | |
| KPI cards | Foundation label quieting (P11-VIS-01) | |

## Deferred to POLISH-06 / maintenance

- Remaining ~70 Admin routes without mechanical migration
- Specialized POS / Kitchen / WhatsApp workspace chrome (POLISH-03 specialized headers)
- Full a11y + responsive certification matrix
