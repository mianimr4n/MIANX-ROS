# Certification standard

## Claimed

Repository-supported accessibility and responsive professional-readiness certification with 0 automated critical/serious findings on the tested matrix.

## Automated gates

- axe critical = 0
- axe serious = 0
- no duplicate document IDs on representative shells
- no unlabeled primary form controls on tested forms
- no keyboard traps on Admin mobile drawer / module navigator
- no route-level horizontal page overflow on public axe routes

## Manual / advisory

- Keyboard primary journeys on representative Admin families (static + prior Owner evidence)
- 200% zoom and reduced-motion: CSS + component contracts; full headed matrix residual where local live stack absent
- Screen-reader device matrix not claimed unless tool listed in MANUAL_TEST_RESULTS

## Not claimed

- Complete legal WCAG certification
- Certification for screen readers/devices not run
- Zero moderate/minor/manual findings
- Dead or deferred routes as FULLY_TESTED

Contract source: `apps/website/client/src/lib/admin-a11y-contract.ts`
