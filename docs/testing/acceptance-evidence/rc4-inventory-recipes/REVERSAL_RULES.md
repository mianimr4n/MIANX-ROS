# RC4-9 Reversal Rules

| Scenario | Behavior |
| --- | --- |
| Cancel before preparing | No consume event → reverse noop |
| Cancel after preparing/ready | `inventory_reverse_kitchen_consumption_atomic` restores stock via linked `sale` movements |
| Duplicate reverse | Idempotent (`kitchen_ticket:{id}:reverse`) |
| Duplicate preparing | Idempotent; no second consume |
| Manual adjustment | Separate; not a substitute for linked reverse |
| Partial refund after consume | Stock reverse only on kitchen/order cancel path in this slice — payment-only refund does not auto-restore |

Reverse always references original consume event (`reversed_event_id`). Never invents an unrelated positive adjustment.
