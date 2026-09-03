# Check-In 007 — Native UI Accessibility Query Repair Plan v25 (Cycle 13)

## 1. Overview

Audit v49 proves that Cycle 12 fixed native CSV data loss and the camera stall, but the full native scheme remains red: 33 unit methods pass while all four UI methods fail before their workflows begin. Required Action #12 identifies the shared cause: `roster.mark007` intentionally has a button accessibility trait, while two UI-test call sites query it through `otherElements`. Cycle 13 corrects that harness query, reruns the complete native scheme, and records an honest result without changing product accessibility or laundering the separately billing-blocked CI run.

## 2. Scope

### In scope

1. Change both `A11yId.mark007` UI-test lookups from `app.otherElements` to `app.buttons`.
2. Preserve long-press timing, admin workflow assertions, the app identifier/label, and `.isButton` trait.
3. Run the two affected methods, all four UI methods, and the complete shared native scheme on iOS 26.4.
4. Re-run existing web formatting, unit, Playwright, and build gates.
5. Update evidence and README only after structured native results prove both targets green; retain CI run `33711898714` as `BLOCKED (external billing)`.

### Out of scope

- Changing `.accessibilityAddTraits(.isButton)`, `roster.mark007`, VoiceOver text, the gesture, admin UI, or any production Swift source.
- Weakening, deleting, skipping, or conditionally accepting any assertion or test.
- Reopening completed CSV/camera work (RA #11); changing web behavior, dependencies, lockfiles, Xcode settings, workflow YAML, `dist/`, signing, deployment, or support targets.
- Clearing billing, pushing/rerunning CI, claiming the blocked run passed, or fabricating an artifact.
- Editing discriminator-owned critique, audit, or backlog files.

## 3. Architecture and Data Flow

```text
RosterView Text("007") + identifier + .isButton
             -> XCUITest app.buttons["roster.mark007"]
             -> 2.2 s press -> admin sheet -> existing assertions

shared native scheme -> temporary xcresult -> exact inventory -> evidence/README
CI run 33711898714 -------------------------------------> BLOCKED unchanged
```

The app owns the semantic accessibility contract. The UI target consumes the element type SwiftUI exposes. Evidence records verified outcomes; it never substitutes prose for a passing gate.

## 4. Technical Decisions and Rationale

### 4.1 Align the test with the semantic role

Use `app.buttons[A11yId.mark007]` at both call sites. The actionable long-press control explicitly declares `.isButton`, giving assistive technology accurate semantics. Removing that trait would satisfy the old query by degrading VoiceOver information. An untyped descendants query is rejected because it could hide future role regressions.

### 4.2 Preserve test strength

Only the element collection changes. The five-second existence check, 2.2-second press, admin-sheet lookup, audio interaction, close behavior, and two-step clear-log assertions remain unchanged. The repair makes existing workflows reachable; it does not reduce what they prove.

### 4.3 Verify in widening layers

Run the two affected methods, the whole UI target, then the shared scheme. The final completion gate is exact: both targets, six named unit suites, 33 unit methods, four UI methods, 37 total passes, no skips/failures, and exit 0.

### 4.4 Preserve external-gate truth

Run `33711898714` failed before steps ran because of an external billing lock. This native-only cycle neither changes nor reruns it. Documentation retains `BLOCKED (external billing)` and records no artifact.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md                           (MOD) — Cycle-13 contract/completion marks
native/CheckIn007UITests/CheckIn007UITests.swift (MOD) — use the button collection for mark007
docs/VERIFICATION_EVIDENCE.md                    (MOD) — append Cycle-13 commands and outcomes
README.md                                        (MOD) — verified native status; unchanged CI block
```

No production Swift file changes. DerivedData, `.xcresult`, logs, screenshots, and `dist/` stay temporary/untracked.

## 6. Implementation Phases

### Phase 1 — Repair the query

1. Confirm `RosterView` still assigns `A11y.mark007`, label `Admin (long press)`, `.isButton`, and a 2.0-second long press.
2. Replace both `app.otherElements[A11yId.mark007]` expressions with `app.buttons[A11yId.mark007]`.
3. Do not change identifiers, waits, press duration, or downstream assertions.
4. Require zero remaining old queries and exactly two button queries.

```swift
let mark = app.buttons[A11yId.mark007]
XCTAssertTrue(mark.waitForExistence(timeout: 5))
mark.press(forDuration: 2.2)
XCTAssertTrue(app.otherElements[A11yId.adminSheet].waitForExistence(timeout: 5))
```

Acceptance: the static query contract is exact and the production accessibility surface is unchanged.

### Phase 2 — Focused native verification

1. Boot and await iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
2. Use fresh temporary DerivedData/result-bundle paths.
3. Run `testAdminOpensToggleAudioAndCloses` and `testClearLogRequiresTwoConfirmations` with a 120-second-per-method ceiling.
4. Run the entire `CheckIn007UITests` target; require exactly four methods and zero failures.
5. Retry once only for diagnosed simulator boot/runner interruption; repeated assertion/lookup failures receive no retry credit.

Acceptance: both affected methods and all four UI methods pass without skips or changed assertions.

### Phase 3 — Complete regression verification

1. Run the shared `CheckIn007` scheme on the same simulator with fresh temporary output paths.
2. Inspect `.xcresult` using installed `xcresulttool`; require both targets, six unit suites, exactly 33 unit and four UI methods, 37 total passes, zero skips/failures, and exit 0.
3. Run `npm ci`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`, `npx playwright test`, and `node scripts/build.mjs` through the sanctioned direct Node path.
4. Confirm `dist/` is untracked and no out-of-manifest file changed.

Acceptance: complete native and web gates pass. Any native failure leaves the cycle incomplete.

### Phase 4 — Durable evidence and status

Append:

```markdown
## Cycle 13 — Native UI Accessibility Query Repair
- Fix commit/tree: `<40-hex SHA or exact tested tree identity>`
- Environment: `<Xcode build; runtime; iPad + UDID>`
- Focused UI: `<commands; 2 affected pass; 4/4 target pass>`
- Full native: `<command; exit 0; 6 suites; 33 unit + 4 UI; no skips/failures>`
- Web: `<versions; formatting; counts; build size/hash>`
- CI: `BLOCKED (external billing)`; run `33711898714`; no steps/artifact
```

Change README native status to PASS only after Phase 3 succeeds. Scan documentation for secrets, absolute/temp paths, placeholders, false CI-PASS language, and stale current claims that the UI target is red. Historical Cycle-12 failure records remain history.

## 7. Integration Contracts

### 7.1 SwiftUI accessibility tree ↔ XCUITest

- **Contract:** `roster.mark007` is a button and is queried through `app.buttons`.
- **Failure:** lookup timeout or semantic-role drift.
- **Recovery:** fail and reconcile the intentional role/query; never use an untyped lookup merely to pass.
- **Migration:** test-only correction; app behavior remains unchanged.

### 7.2 Admin affordance ↔ workflows

- **Contract:** a 2.2-second press exceeds the 2.0-second threshold and opens `admin.sheet`.
- **Failure:** sheet absent, gesture undelivered, or control unavailable.
- **Recovery:** retain diagnostics and stop; do not lengthen waits/remove assertions without another approved plan.
- **Migration:** none; gesture and identifiers remain stable.

### 7.3 Native runner ↔ evidence

- **Contract:** exit status and `.xcresult` agree on both targets and 37 methods.
- **Failure:** nonzero exit, missing inventory, skip, or failure.
- **Recovery:** one infrastructure-only retry; otherwise record FAIL and leave completion open.
- **Migration:** fresh temporary results prevent attribution to Cycle 12.

### 7.4 Git tree ↔ documentation

- **Contract:** evidence identifies the tested tree and separates native PASS from CI BLOCKED.
- **Failure:** SHA ambiguity, unverified PASS, invented artifact, leak, or out-of-manifest diff.
- **Recovery:** correct docs or rerun after code changes before commit.
- **Migration:** append Cycle 13 rather than rewriting historical failures.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response |
| --- | --- | --- |
| Mark absent from buttons | focused timeout | Fail; inspect tree without weakening role semantics |
| Long press misses sheet | existing assertion | Fail; preserve duration and diagnose separately |
| Test state leaks | per-method app launch/target run | Fail and inspect isolation; do not reorder away defect |
| Simulator interruption | bootstatus/runner diagnostics | One clean boot retry, then stop |
| Missing method/target | xcresult mismatch | Fail even if command exits 0 |
| Native assertion failure | xcresult failure | No retry credit; record exact failure |
| Web gate failure | nonzero exit | Stop; do not publish PASS |
| CI billing locked | stable annotation | Preserve BLOCKED; no poll/repush |
| Dirty tracked tree | porcelain status | Preserve user work; stop on overlap |
| Secret/path/placeholder | final diff scan | Redact before commit |

## 9. Stability and Performance

- Two O(1) test queries change; product runtime, allocation, state, and dependencies are unchanged.
- Existing five-second waits and 2.2-second presses stay bounded. Focused methods have 120-second outer ceilings; the full scheme permits one infrastructure-only retry.
- Fresh temporary results avoid stale attribution and are excluded from Git.
- No persistent data/migration is touched; failed tests do not mutate tracked source.

## 10. Testing Strategy

- **Static:** zero old and exactly two corrected queries; production role, identifier, label, and gesture remain.
- **Focused UI:** both admin methods prove lookup, long press, sheet, toggle/close, and two-confirmation clear.
- **UI integration:** all four methods cover roster, repeat guest, and both admin workflows.
- **Native integration:** two targets, six suites, 33 unit + 4 UI = 37 passes, no skips/failures.
- **Web regression:** clean install, Prettier, all unit/e2e tests, deterministic build.
- **Documentation:** exact tree/environment/counts; native PASS only after success; CI explicitly BLOCKED.

## 11. Environment and Toolchain

- Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
- Scheme `CheckIn007`; targets `CheckIn007Tests` and `CheckIn007UITests`.
- CI pins Node 24.20.0. The sanctioned local direct-tool path uses Node 26.3.0/npm 11.16.0 without host changes.
- Locked versions remain Playwright 1.62.1, Prettier 3.9.6, acorn 8.18.0. No dependency/project-format change.

Fresh-clone web setup remains `npm ci`; Xcode resolves the checked-in project without a package manager.

## 12. Deployment, Distribution, and Rollback

No deployment, push, or external mutation occurs. Roll back with `git revert <implementation-commit>`; there is no migration or data impact. Publication and billing remediation require separate operator action.

## 13. Open Questions and Decision Gates

1. Does the typed button query resolve consistently? Audit v49 predicts yes; the focused run decides. Failure stops work rather than authorizing a semantic workaround.
2. Will billing be cleared? This remains external and non-blocking here; it cannot be represented as PASS.

Neither permits scope expansion or assertion weakening.

## 14. Completion Checklist

- [ ] Both lookups use `app.buttons`; existing workflow assertions remain unchanged.
- [ ] Both affected admin methods pass within bounds on the named simulator.
- [ ] All four UI methods pass with zero skips/failures.
- [ ] Full native scheme proves both targets, six suites, 33 unit + 4 UI, exit 0, and zero skips/failures.
- [ ] Web formatting, unit, Playwright, and build gates pass.
- [ ] Evidence/README identify the tested tree and native PASS, retain CI `BLOCKED (external billing)`, and contain no leaks/placeholders/out-of-manifest changes.

Every checkbox is required. This cycle closes RA #12 only; RA #10 remains externally blocked and RA #11 remains completed.
