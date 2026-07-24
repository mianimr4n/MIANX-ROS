# RC1 Database Status

## Migrations

- **Count:** 29 SQL files under `supabase/migrations/`
- **Applied via:** local Supabase (`pnpm local:start` / `npx supabase start`)

## Domain coverage

| Domain | Representative tables |
| --- | --- |
| Orders | `orders`, `order_items`, `order_status_logs`, payments, reviews |
| Kitchen | `kitchen_tickets`, `kitchen_ticket_items` |
| Branches / dine-in | `branches`, `restaurant_tables`, `dine_in_sessions`, bills |
| Identity / RBAC | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `staff`, invites |
| Delivery | `riders`, `deliveries` |
| Catalog | menu categories/items/variants/modifiers |
| Customer | `customers`, addresses, favorites |

## Roles (seeded)

`super-admin`, `branch-manager`, `kitchen`, `cashier`, `rider`, `customer-support`, `customer`

## RLS

Row Level Security is enabled across foundation and feature migrations, with public catalog reads, staff branch-scoped policies, and customer own-row policies.

## Grants

Migrations include grants and later **P0 hardening** that narrows anon/authenticated write privileges.  

**Operator warning:** Do not re-apply obsolete blanket `GRANT INSERT/UPDATE/DELETE … TO anon` instructions from stale docs — that undoes hardening.

## Gaps vs full ERP

No first-class inventory stock ledger, purchasing PO ledger, finance GL, or loyalty points tables as operational backends for Foundation UIs.
