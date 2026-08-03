# Shared accessibility foundation

## Fixes in this slice

| Area | Change |
| --- | --- |
| AdminShell mobile drawer | Focus trap, initial focus, body scroll lock, `role="dialog"` + `aria-modal` while open, Escape closes |
| AdminShell landmarks | Skip link, `main#admin-main`, sidebar `aria-label="Admin navigation"` |
| Branch selector | Escape closes menu first; labeled listbox retained |
| Module navigator | Always `aria-label="Go to module"`; Ctrl/Cmd+K skips inputs/textareas/contenteditable |
| Page headings | Shell owns sole page `h1`; module headers demoted to `data-admin-page-title` (not `h1`) |
| AdminDataState | `aria-live` assertive for ERROR/UNAVAILABLE; polite for LOADING |
| Ops tables | Orders + Delivery captions / `aria-label` + overflow wrappers |
| Reduced motion | Existing `.admin-shell` reduce media + `motion-reduce:` utilities retained |

## Preserved

- POLISH-01 `aria-current` / group expand in sidebar
- POLISH-02 Owner hierarchy
- POLISH-03 ops specialized headers (non-h1 titles)
- POLISH-04/05 capability maturity vs operational status separation
- KitchenManagerShell specialized KDS `h1` (no AdminShell)
