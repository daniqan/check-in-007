# Check-In 007 — Native UI Interaction and Accessibility Repair Plan v26 (Cycle 13)

## 1. Overview

Cycle 13 closes both independently proven causes of the four red native UI methods. Methods 3–4 query the intentionally button-typed `roster.mark007` through the wrong XCUITest collection (RA #12). Methods 1–2 locate a roster-row button, but a fresh failure hierarchy captured after `firstRow.tap()` still shows the complete roster and no `scan.status`: the synthesized center tap lands outside the plain-style label's effective hit region (RA #13). The repair aligns typed queries and hit targets, gives the combined result announcement a stable identifier, and requires the complete 33-unit/4-UI native scheme to pass without weakening assertions or misrepresenting the billing-blocked CI run.

## 2. Scope

### In scope

1. Make each roster button label fill its row and define a rectangular content shape so touch, VoiceOver, and XCUITest activate the same full-width target.
2. Put `result.title` on the combined result accessibility element so the single-announcement VoiceOver contract and XCUITest identifier coexist.
3. Change both `roster.mark007` UI-test lookups from `app.otherElements` to `app.buttons`.
4. Add a UI-test assertion helper that attaches `app.debugDescription` only when a required element is absent, retaining all waits, gestures, and workflow assertions.
5. Run focused tests for each repair, all four UI methods, the complete native scheme, and all web gates; update evidence only from structured results.

### Out of scope

- Changing `AppModel`, camera/session code, timing constants, persistence, audio behavior, `.isButton`, the 2.0-second admin gesture, or visible styling.
- Weakening, deleting, skipping, conditionally accepting, or merely lengthening assertions.
- Reopening completed CSV/camera work (RA #11), changing dependencies/lockfiles/Xcode settings/workflow YAML/`dist/`, or modifying web behavior.
- Clearing billing, pushing/rerunning CI, claiming run `33711898714` passed, or fabricating its artifact.
- Editing discriminator-owned critique, audit, or backlog files.

## 3. Architecture and Data Flow

```text
Roster row Button -> full-width label + Rectangle contentShape
 -> center tap reaches Button action -> AppModel.selectGuest
 -> ScanView `scan.status` StaticText -> AppModel.finishScan
 -> ResultView combined StaticText `result.title` -> roster

RosterView `007` + .isButton -> app.buttons[roster.mark007]
 -> 2.2 s press -> admin sheet -> existing assertions

required-element miss -> helper attaches app.debugDescription -> test fails
native scheme -> xcresult inventory -> evidence/README
CI run 33711898714 -------------------------------> BLOCKED unchanged
```

`AppModel` continues to own state. SwiftUI views define hit/accessibility surfaces; XCUITest consumes typed identifiers. Diagnostics are failure-only and never affect app behavior.

## 4. Technical Decisions and Rationale

### 4.1 Repair the full-row interaction surface

Apply `.frame(maxWidth: .infinity, alignment: .leading)` and `.contentShape(Rectangle())` to the roster button label returned by `rosterRow`, after its padding. The captured post-tap hierarchy remains on the roster, proving activation—not `selectGuest`, scan timing, or camera startup—is the first failure. XCUITest reports an 820-point-wide button frame, while the current plain-style `VStack` label has intrinsic-width content; its center can be blank hit space. A full-width rectangular label makes the visual/accessibility frame and hit region agree while preserving the 44-point minimum height and `.buttonStyle(.plain)`.

Rejected: coordinate taps encode layout and hide the product defect; a test hook bypasses UI; changing `AppModel` cannot repair a gesture that never reaches the button.

### 4.2 Preserve one result announcement with a stable identifier

Move `.accessibilityIdentifier(A11y.resultTitle)` from the child name `Text` to the `VStack` after `.accessibilityElement(children: .combine)`. Combining intentionally exposes one VoiceOver announcement; a child identifier is unstable once absorbed. The combined element remains a `StaticText`, keeps the existing label (`name, table[, already on record]`), and becomes queryable as `app.staticTexts[A11yId.resultTitle]`.

Rejected: removing `.combine` fragments the announcement; querying display text is brittle; an untyped query hides role regressions.

### 4.3 Align the admin query with its role

Use `app.buttons[A11yId.mark007]` at both call sites. `RosterView` deliberately adds `.isButton`; removing it degrades VoiceOver. Only the collection changes: existence waits, 2.2-second press, admin interactions, close behavior, and two-step clear-log assertions remain.

### 4.4 Failure-only hierarchy diagnostics

Route required-element assertions through this helper. It keeps the same timeout, attaches the hierarchy on failure, and fails at the caller. It never retries, taps, or changes outcomes.

```swift
@discardableResult
private func requireExists(
    _ element: XCUIElement,
    timeout: TimeInterval,
    file: StaticString = #filePath,
    line: UInt = #line
) -> Bool {
    let exists = element.waitForExistence(timeout: timeout)
    if !exists {
        let attachment = XCTAttachment(string: app.debugDescription)
        attachment.name = "Accessibility hierarchy after missing \(element)"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    XCTAssertTrue(exists, file: file, line: line)
    return exists
}
```

### 4.5 Preserve external-gate truth

Run `33711898714` failed before steps ran due to an external billing lock. This native-only cycle neither reruns nor banks it. Docs retain `BLOCKED (external billing)` and record no artifact.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md                           (MOD) — v26 contract/completion marks
native/CheckIn007/Views/RosterView.swift         (MOD) — full-width rectangular row hit target
native/CheckIn007/Views/ResultView.swift         (MOD) — identify combined result element
native/CheckIn007UITests/CheckIn007UITests.swift (MOD) — typed admin queries/failure diagnostics
docs/VERIFICATION_EVIDENCE.md                    (MOD) — append exact Cycle-13 results
README.md                                        (MOD) — current native status/unchanged CI block
```

All Swift files are already target members, so no project-file edit is needed. DerivedData, `.xcresult`, logs, screenshots, videos, and `dist/` remain temporary/untracked.

## 6. Implementation Phases

### Phase 1 — Repair roster activation and result identity (RA #13)

1. Retain `rosterRow` text, padding, colors, and spacing; add full-width leading alignment and rectangular content shape after padding.
2. Remove `result.title` from the child name `Text`; retain `.accessibilityElement(children: .combine)` and its label, then assign `result.title` to that combined `VStack`.
3. Confirm no duplicate identifier and `scan.status` remains a `StaticText`.
4. Run `testFirstCheckInFlow` and `testRepeatGuestDoesNotDuplicateOneScan` separately, then together.

Per-method acceptance:

- `testFirstCheckInFlow`: center-tap activates the row; `scan.status` appears within unchanged 5 seconds; combined `result.title` appears within 10 seconds; roster returns within 10 seconds.
- `testRepeatGuestDoesNotDuplicateOneScan`: both center-taps activate the same row; combined `result.title` appears after each; existing store/visit logic remains unchanged.

### Phase 2 — Repair admin queries and diagnostics (RA #12 + Path to 100)

1. Replace exactly two `app.otherElements[A11yId.mark007]` expressions with `app.buttons[A11yId.mark007]`; leave the product identifier, label, `.isButton`, and gesture unchanged.
2. Add `requireExists` per §4.4 and use it for required `scan.status`, `result.title`, `mark007`, admin-sheet, and roster-return assertions with existing timeouts. Keep the optional audio-toggle branch optional.
3. Require zero old `mark007` queries and exactly two button queries.
4. Run `testAdminOpensToggleAudioAndCloses` and `testClearLogRequiresTwoConfirmations` separately, then together.

Per-method acceptance:

- `testAdminOpensToggleAudioAndCloses`: typed button exists within 5 seconds, 2.2-second press opens sheet, optional toggle and close behavior remain, roster returns.
- `testClearLogRequiresTwoConfirmations`: typed button opens sheet and both confirmation identifiers remain required in order.
- A local nonexistent-identifier probe may confirm attachment retention but must be reverted before commit; no permanent failing test is added.

### Phase 3 — Complete regression verification

1. Boot/await iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`; use fresh temporary DerivedData/result paths.
2. Run all four UI methods; require four passes, zero skips/failures, exit 0.
3. Run shared scheme `CheckIn007`; inspect `.xcresult` with installed `xcresulttool` and require both targets, six unit suites, exactly 33 unit + four UI methods = 37 passes, zero skips/failures, exit 0.
4. Retry once only for diagnosed simulator boot/runner interruption. Assertion, hierarchy, or product failures receive no retry credit.
5. Run `npm ci`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`, `npx playwright test`, and `node scripts/build.mjs` through the sanctioned direct Node path.
6. Confirm `dist/` is untracked and only manifest files changed.

Acceptance: native and web gates pass. Any product/test failure leaves completion open and its hierarchy attachment identifies visible element types/state.

### Phase 4 — Durable evidence and status

Append tested-tree identity, Xcode/runtime/device, focused outcomes, full native inventory, web versions/counts/build hash+size, and:

```markdown
- CI: `BLOCKED (external billing)`; run `33711898714`; no steps/artifact.
```

Change README native status to PASS only after Phase 3. Scan docs for secrets, absolute/temp paths, placeholders, false CI-PASS language, and stale current claims that all UI failures were initial lookups. Preserve Cycle-12 raw history while adding the correction that methods 1–2 failed after row lookup.

## 7. Integration Contracts

### 7.1 Row geometry ↔ touch/accessibility activation

- **Contract:** visual row, accessibility frame, and rectangular hit region cover the same width; action calls existing audio unlock then `selectGuest` once.
- **Failure:** hierarchy stays on roster after center tap, duplicate transition, or changed layout.
- **Recovery:** fail with hierarchy; inspect modifier placement, never use coordinate/test hooks.
- **Migration:** additive hit geometry; identifiers, state, persistence unchanged.

### 7.2 AppModel state ↔ scan/result accessibility

- **Contract:** activation yields `scan.status` `StaticText`; completion yields one combined `result.title` `StaticText`; dismissal returns roster.
- **Failure:** missing/wrong-typed element or stuck state.
- **Recovery:** attach hierarchy and fail; no timeout inflation/bypass.
- **Migration:** announcement wording remains byte-for-byte; identifier ownership moves child→combined parent.

### 7.3 Admin semantics ↔ XCUITest

- **Contract:** `roster.mark007` is a Button queried through `app.buttons`; 2.2 seconds exceeds the 2.0-second threshold.
- **Failure:** typed lookup/sheet timeout.
- **Recovery:** attach hierarchy and reconcile intentional role/query.
- **Migration:** test-only query correction; VoiceOver semantics unchanged.

### 7.4 Runner/evidence ↔ Git tree

- **Contract:** exit and `.xcresult` agree on 37 methods; evidence names tested tree and separates native PASS from CI BLOCKED.
- **Failure:** nonzero exit, inventory mismatch, skip, SHA ambiguity, leak, or out-of-manifest diff.
- **Recovery:** correct docs or rerun after code changes; never infer PASS.
- **Migration:** append Cycle 13; preserve historical raw results.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response |
| --- | --- | --- |
| Center tap leaves roster | missing `scan.status` + hierarchy | Fail; verify full-width/content-shape order |
| Row action fires twice | unexpected phase/log behavior | Fail; preserve one action and `AppModel` guard |
| Result absent/wrong type | missing typed ID + hierarchy | Fail; verify combined-parent ID/state |
| Admin mark absent from buttons | timeout + hierarchy | Fail; preserve `.isButton`, repair query only |
| Long press misses sheet | assertion + hierarchy | Fail; preserve 2.2 seconds |
| Test state leaks | per-method launch/hierarchy | Fail; inspect isolation, do not reorder away |
| Simulator interruption | bootstatus/runner diagnostics | One clean-boot retry, then stop |
| Missing method/target | xcresult mismatch | Fail even on command exit 0 |
| Native/web failure | nonzero exit/result | No retry credit; record exact failure |
| CI billing locked | run metadata | Preserve BLOCKED; no poll/repush |
| Overlapping user change | porcelain/diff | Preserve work and stop |
| Secret/path/placeholder | final diff scan | Redact before commit |

## 9. Stability and Performance

- Row rendering remains O(n) in SwiftUI's lazy `List`; two constant-cost modifiers add no collection or retained state. Other changes are O(1).
- Full-width labels preserve row count/minimum height. Hierarchy text allocates only after timeout and lives only in temporary `.xcresult`.
- Existing 5/10-second waits, 2.2-second press, and 4.5/5-second timers remain bounded. Focused methods use a 120-second outer ceiling; full scheme permits one infrastructure-only retry.
- No migration, network request, or dependency is introduced. Temporary results stay outside Git.

## 10. Testing Strategy

- **Static:** padding → full-width frame → content shape; `scan.status` and combined `result.title` are `StaticText`; zero old/two corrected admin queries; role/gesture unchanged.
- **Focused UI:** each method independently satisfies §6 acceptance.
- **Diagnostics:** helper retains hierarchy and caller attribution without changing timeout/result.
- **Native integration:** two targets, six suites, 33 unit + 4 UI = 37 passes, no skips/failures.
- **Web regression:** clean install, Prettier, all unit/e2e tests, deterministic budgeted build.
- **Docs:** exact tree/environment/counts; native PASS only after success; CI BLOCKED.

## 11. Environment and Toolchain

- Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16) `A155995F-EC83-41BE-95B2-1A5F390ABF59`.
- Scheme `CheckIn007`; targets `CheckIn007Tests` and `CheckIn007UITests`.
- CI pins Node 24.20.0. Sanctioned local direct tools use Node 26.3.0/npm 11.16.0 without host changes.
- Locked Playwright 1.62.1, Prettier 3.9.6, acorn 8.18.0 remain unchanged.
- Fresh clone: `npm ci`; Xcode resolves the checked-in project without a package manager.

## 12. Deployment, Distribution, and Rollback

No deployment, push, or external mutation occurs. Roll back with `git revert <implementation-commit>`; no migration or stored data is affected. Publication and billing remediation require separate operator action.

## 13. Open Questions and Decision Gates

1. Does full-width geometry make the already-discoverable row activate? The post-tap roster hierarchy supports this diagnosis; focused methods decide. Failure stops rather than authorizing a bypass.
2. Does the combined `VStack` expose `result.title` as `StaticText` on iOS 26.4? SwiftUI combined-text semantics predict yes; focused hierarchy decides. A different type requires a plan amendment, not an untyped query.
3. Will billing clear? External and non-blocking here; it cannot be represented as PASS.

None permits scope expansion or assertion weakening.

## 14. Completion Checklist

- [x] Full-width rows make methods 1–2 reach scan/result; combined `result.title` retains one announcement.
- [x] Both admin lookups use `app.buttons`; workflows/assertions remain.
- [x] Failure-only hierarchy attachments work without bypass/retry/timeout inflation.
- [x] Each UI method and the whole UI target pass with zero skips/failures.
- [x] Full native scheme proves both targets, six suites, 33 unit + 4 UI, exit 0, zero skips/failures.
- [x] Web formatting, unit, Playwright, and build gates pass.
- [x] Evidence/README name the tested tree/native PASS, correct old framing, retain CI `BLOCKED (external billing)`, and contain no leaks/placeholders/out-of-manifest changes.

Every checkbox is required. This cycle closes RA #12 and RA #13 only; RA #10 remains externally blocked and RA #11 completed.
