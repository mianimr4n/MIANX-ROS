# Phase 2 Readiness Audit — UI Boundaries

**Audit date:** 2026-08-04
**Status:** PROPOSED — Interface boundaries and capability labeling rules

---

## Controlled Vocabulary for UI Status Labels

To prevent misleading claims, all Phase 2 UI surfaces must strictly adhere to the standardized data-state labels:

- `LIVE`: Operational on real APIs and verified database tables.
- `PARTIAL_LIVE`: Core API connected; secondary features or edge cases pending.
- `FOUNDATION`: UI structure and mock/read-only data exist; backend integration incomplete.
- `CONFIGURATION_REQUIRED`: Feature is built but requires external provider keys or branch settings to function.
- `UNAVAILABLE`: Module or feature disabled / offline in current release.
- `DEFERRED`: Explicitly postponed to a future phase.

> [!WARNING]
> Proposed Phase 2 UI components MUST NEVER be labeled `LIVE` during audit or implementation phase until acceptance gate verification passes.

---

## Route & UI Scope Definitions

### Phase 2.1: Settings & Branch Control Plane
- **Route**: `/admin/settings` & `/admin/branch`
- **User Role**: `super-admin`, `branch-manager`
- **UI Components**: `ConfigDraftEditor`, `VersionHistoryPanel`, `EffectiveValueViewer`, `RollbackConfirmModal`.
- **States**: Loading, Draft (Unsaved), Pending Approval, Active, Error (Validation Failure).
- **Mobile/Responsive**: Multi-tab interface collapses to accordion or stacked cards on viewports < 768px.
- **Accessibility**: ARIA live regions for draft auto-save and activation alerts; full keyboard navigation.

### Phase 2.2: Support & WhatsApp Foundation
- **Route**: `/admin/whatsapp` (upgrade from foundation) & `/admin/support`
- **User Role**: `customer-support`, `branch-manager`, `super-admin`
- **UI Components**: `SupportInboxWorkspace`, `MessageThreadPanel`, `CustomerQuickInfoCard`, `TemplatePickerModal`, `AgentAssignmentDropdown`.
- **States**: Provider Connecting, Live Sync, Unread Badge, Delivery Failed (Retry button), Disconnected (Warning banner).
- **Mobile/Responsive**: Two-column layout (Thread list | Message detail) switches to single-column drawer navigation on mobile.
- **Accessibility**: Focus management when opening conversation drawers; screen-reader notification on incoming messages.

### Phase 2.3: CRM & Authoritative Customer Master
- **Route**: `/admin/crm` & `/admin/customers`
- **User Role**: `super-admin`, `customer-support`, `branch-manager` (read-only masked)
- **UI Components**: `CustomerMasterTable`, `CustomerProfileDrawer`, `MergeCustomerWizard`, `ConsentHistoryLog`, `PrivacyRequestPanel`.
- **States**: Aggregating, Merged (Badge), Blocked (Alert Banner), Right-to-Delete (Anonymized Placeholder).
- **Mobile/Responsive**: Table transforms into expandable cards with key metrics (Lifetime Value, Order Count).
- **Accessibility**: Explicit alt text and table header scoping (`th id="..."`); keyboard shortcuts for customer search.

### Phase 2.4: Delivery & Rider Completion
- **Route**: `/admin/delivery` & `/ops/dispatch`
- **User Role**: `branch-manager`, `rider`, `super-admin`
- **UI Components**: `DispatchConsole`, `RiderShiftTracker`, `PODCaptureModal`, `CODSettlementDrawer`, `FailedDeliveryDialog`.
- **States**: Unassigned, Dispatched, Out for Delivery, Delivered (POD Verified), Failed (Return Required).
- **Mobile/Responsive**: Dedicated PWA-friendly view for Riders (`/ops/dispatch`) optimized for high-contrast outdoors and one-handed operation.
- **Accessibility**: High-contrast state badges (Green/Yellow/Red); large tap targets (minimum 48x48px) for rider actions.

### Phase 2.5: Accounting & Profitability Depth
- **Route**: `/admin/finance` & `/admin/reports`
- **User Role**: `super-admin`, `finance`
- **UI Components**: `PeriodCloseConsole`, `JournalEntryGrid`, `TaxReconciliationTable`, `COGSVariancePanel`, `ReversalReasonModal`.
- **States**: Period Open, Period Closing (Validation Check), Period Locked (Read-Only), Reversal Pending.
- **Mobile/Responsive**: Large financial grids require horizontal scroll locks; summary KPI cards wrap vertically.
- **Accessibility**: Number formatting accessibility (`aria-label="10,000 Pakistani Rupees"`); tabular numbers font features.

### Phase 2.6: AI Command Center
- **Route**: `/admin/ai-team` & `/admin/ai-command-center`
- **User Role**: `super-admin`
- **UI Components**: `AdvisorySummaryCards`, `AIApprovalInbox`, `ModelProviderStatusWidget`, `ConfidenceRatingBadge`.
- **States**: Advisory Only, Awaiting Human Approval, Approved/Executed, Hallucination/Confidence Warning.
- **Mobile/Responsive**: Card-based stack with swipe-to-dismiss or swipe-to-approve gestures on mobile.
- **Accessibility**: Clear visual indicator distinguishing AI generated text from human system data; high contrast badges.
