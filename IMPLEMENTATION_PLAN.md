# Check-In 007 — Native CSV Parity and External-Gate Disposition Plan v24 (Cycle 12)

## 1. Overview

Audit v47 proves that the iOS guest-import parser loses a row for a UTF-8 BOM + CRLF CSV containing quoted commas and doubled quotes. The same fixture passes in the web parser. Cycle 12 restores native/web parity, characterizes and resolves the observed camera-test stall, reruns the complete native suite on the installed iOS 26.4 iPad simulator, and records an honest terminal disposition for the exact-SHA GitHub Actions run blocked by account billing.

This plan addresses Audit v47 Required Action #11 and both directives in Implementation Verification v10. It supersedes the success-only Cycle-11 closure plan without converting failed or blocked evidence into a pass.

## 2. Scope

### In scope

1. Correct `CSVCodec.parseRows` to match `src/lib/csv.mjs` for BOM, CRLF, quoted commas, doubled quotes, blank rows, trailing newlines, and unterminated quotes.
2. Add native regression coverage that prevents the exact parity defect and reports row-count failure without a secondary out-of-range crash.
3. Reproduce the camera test in isolation, bound its execution, and make the smallest production or test isolation change needed if it still stalls.
4. Run every web gate and the complete native scheme on the installed iOS 26.4 iPad simulator.
5. Record exact commands, environment, counts, failures, and the Cycle-11 CI billing disposition in durable evidence and README status.

### Out of scope

- Weakening CSV expectations, changing web behavior, replacing the parser with a dependency, or changing guest normalization/export semantics.
- Camera redesign, capture output, audio permission/input, UI redesign, signing, deployment, or support-target changes.
- Changing GitHub billing, workflow YAML, secrets, repository visibility, protection, dependencies, lockfiles, or generated `dist/`.
- Calling the billing-blocked run a success, fabricating an artifact, force-pushing, or requiring new CI to prove the native-only correction.
- Editing discriminator-owned `BACKLOG.md`, `CONSOLIDATED_AUDIT.md`, or `IMPLEMENTATION_PLAN_CRITIQUE.md`.

## 3. Architecture and Data Flow

```text
CSV text -> CSVCodec.parseRows state machine <- parity contract -> src/lib/csv.mjs
                         |
                         v
              parseGuests -> GuestCatalog.normalize -> native roster

CameraPrivacyTests -> CameraPreviewModel.start -> authorization/session -> bounded state

iOS 26.4 iPad -> xcodebuild test -> temporary xcresult -> durable summary
Cycle-11 exact-SHA CI failure ---------------------------> terminal BLOCKED summary
```

`CSVCodec` owns tokenization only; `GuestCatalog` retains normalization/deduplication. `CameraPreviewModel` owns capture lifecycle; tests observe it without adding outputs. Temporary DerivedData and result bundles remain outside the repository.

## 4. Technical Decisions and Rationale

### 4.1 Fix Swift CRLF grapheme handling

The algorithms look equivalent but JavaScript indexes UTF-16 code units while Swift `Character` iterates extended grapheme clusters. Swift may expose `"\r\n"` as one `Character`; comparisons only with `"\n"` and `"\r"` miss the boundary and merge records. Confirm this at the failing fixture, then explicitly recognize combined CRLF as a delimiter while retaining standalone CR/LF handling.

This narrow fix is preferred to a new CSV library (which would not guarantee the exact compatibility contract) or line splitting (which breaks quoted newlines). The parser stays single-pass O(n).

### 4.2 Preserve the web parser as source of truth

Shared fixtures must produce identical grids. The expected two-row result cannot change. The state machine continues to preserve newlines inside quotes, drop all-whitespace rows, and throw `CSVError.unterminatedQuote` at EOF with an open quote.

### 4.3 Prevent secondary test crashes

The regression first asserts row count and then conditionally unwraps the data row before cell comparison. A missing row still fails, but no unsafe `rows[1]` obscures later test results.

### 4.4 Bound camera diagnosis and preserve privacy

Run `CameraPrivacyTests` alone with fresh temporary outputs and a command timeout. If it passes, characterize the old stall as fallout from the CSV test-process crash and leave camera files unchanged. If reproducible, isolate blocking AVFoundation work from `@MainActor` on a private serial queue and publish state back to the main actor. Preserve zero audio inputs and zero outputs.

### 4.5 Honest bounded CI disposition

Run `33711898714` proves only the push trigger and exact `headSha` selection. Its billing-lock failure is an environment-blocked terminal disposition unless the owner clears billing. Record `BLOCKED (external billing)` with URL/event/branch/SHA and the absence of executed steps/artifact; do not poll, repush, or call it `PASS`.

## 5. File Manifest

```text
IMPLEMENTATION_PLAN.md                              (MOD) — Cycle-12 contract/completion marks
native/CheckIn007/Services/CSVCodec.swift           (MOD) — recognize Swift CRLF delimiter
native/CheckIn007Tests/CSVCodecTests.swift          (MOD) — parity regressions and safe assertions
native/CheckIn007/Services/CameraPreviewModel.swift (MOD, CONDITIONAL) — queue isolation if stall reproduces
native/CheckIn007Tests/CameraPrivacyTests.swift      (MOD, CONDITIONAL) — bounded observation if needed
docs/VERIFICATION_EVIDENCE.md                       (MOD) — Cycle-12 results and CI disposition
README.md                                           (MOD) — accurate native/CI status
```

Conditional camera files remain unchanged if isolation passes. No other tracked file changes. Test output, DerivedData, `.xcresult`, logs, and `dist/` remain temporary/untracked.

## 6. Implementation Phases

### Phase 1 — Reproduce and correct CSV parsing

1. Run only `CSVCodecTests` on the installed iOS 26.4 iPad and keep the concise failure summary outside Git.
2. Confirm Swift iteration exposes the fixture's CRLF delimiter as a combined `Character`.
3. Treat standalone LF and combined CRLF as row delimiters outside quotes, while ignoring standalone CR as before.
4. Make the failing test safe against missing-row indexing.
5. Add table-driven assertions for LF, CRLF, terminal CRLF, quoted embedded LF/CRLF, blank records, and the original BOM/comma/doubled-quote fixture.
6. Run native CSV tests and the equivalent web CSV unit test.

```swift
enum CSVCodec {
    static func parseRows(_ input: String) throws -> [[String]]
    // Strip one BOM; parse once; recognize Character("\r\n") as a delimiter;
    // preserve quoted CR/LF; drop whitespace rows; throw on an open quote.

    static func parseGuests(_ input: String) throws -> ImportResult
    // Require name/table, keep id optional, preserve GuestCatalog normalization.
}
```

Acceptance: the audit fixture yields exactly `[["name", "table"], ["Vale, Bianca", "Table \"3\""]]`; all CSV tests and unchanged web parity tests pass.

### Phase 2 — Characterize the camera stall

1. Terminate an orphaned simulator app/test process through `simctl` only; never delete global Xcode state or the simulator.
2. Run `CameraPrivacyTests` alone with fresh temporary outputs and a 120-second ceiling. Retry once only for simulator launch/setup interruption.
3. If all three pass, record non-reproduction after removal of the CSV crash and leave conditional files untouched.
4. If the stall reproduces, locate authorization/configuration/start/stop blocking; move session operations to one private serial queue, return state to `MainActor`, make stop idempotent, and await a bounded terminal state without sleeps.
5. Re-run the isolated camera suite twice after a camera change.

```swift
@MainActor
final class CameraPreviewModel: ObservableObject {
    func start() async // Authorization then awaited serial work; reaches visible terminal state.
    func stop()        // Idempotent and does not block MainActor.
    func configureSessionInputs() -> State // Video-only input; no audio/output.
    var isPreviewOnly: Bool { get }
}
```

Acceptance: all camera tests finish within bounds; without a camera the model is not `.running`; privacy assertions remain true. Non-reproduction is valid characterization, but a reproduced stall must be fixed.

### Phase 3 — Full regression and native verification

1. Run `npm ci`, `npx prettier --check .`, `node --test tests/unit/*.test.mjs`, `npx playwright test`, and `node scripts/build.mjs` using the existing sanctioned direct Node path.
2. Select/boot the installed iOS 26.4 iPad by UDID and await boot completion.
3. Use `mktemp -d`, isolated `-derivedDataPath` and `-resultBundlePath`, and run the shared `CheckIn007` scheme.
4. Inspect `.xcresult` with installed `xcresulttool`; require both test targets, six named unit suites, the 32 baseline unit methods plus new regressions, four UI methods, zero failures, and exit 0.
5. Retry only an identified simulator-infrastructure failure once; product failures receive no retry credit.

Acceptance: all web gates pass and structured native results prove every expected test ran with zero failures. No generated output is tracked.

### Phase 4 — Durable evidence and status

Append:

```markdown
## Cycle 12 — Native CSV Parity Repair
- Fix commit: `<40-hex SHA>`
- Environment: `<Xcode build; runtime; iPad + UDID>`
- CSV regression: `<fixture/result; test count; zero failures>`
- Camera characterization: `<isolated command and result>`
- Full native result: `<command; exit; targets/suites/methods; zero failures>`
- Web result: `<versions; counts; build size/hash>`
- CI disposition: `BLOCKED (external billing)`; run `33711898714`; no artifact
```

README states native tests pass after repair while exact-SHA CI remains externally blocked. Scan for secrets, absolute/temp paths, placeholders, and out-of-manifest changes. Check completion only after evidence exists.

## 7. Integration Contracts

### 7.1 Swift parser ↔ web parser

- **Contract:** shared fixtures yield equal grids/errors.
- **Failure:** differing rows/cells, blank-row treatment, or quote errors.
- **Recovery:** fail regression and compare parsing branches; never alter web expectations to fit Swift.

### 7.2 Rows ↔ guest normalization

- **Contract:** header survives and every nonblank data row reaches normalization once.
- **Failure:** dropped/merged rows or absent headers.
- **Recovery:** schema errors throw; callers retain existing presentation; no partial import is committed.

### 7.3 Camera ↔ simulator tests

- **Contract:** `start()` terminates to a non-running state without camera access; session is preview-only.
- **Failure:** deadlock, indefinite permission wait, false running state, or privacy violation.
- **Recovery:** timeout captures diagnostics; one qualified retry separates runner setup from product behavior.

### 7.4 Git tree ↔ evidence

- **Contract:** native evidence names the tested fix SHA; CI evidence names Cycle-11 target `845116d…` and separates trigger success from job failure.
- **Failure:** SHA ambiguity, false PASS, missing counts, or invented artifact.
- **Recovery:** correct before commit; rerun native tests if the tested tree changes.

## 8. Error Handling and Edge Cases

| Condition | Detection | Response |
| --- | --- | --- |
| Empty/whitespace/BOM-only CSV | filtered grid empty | Preserve `CSVError.empty` from `parseGuests` |
| LF, CRLF, terminal newline | regression matrix | One boundary; filter empty terminal row |
| CRLF inside quotes | quoted-state test | Preserve both characters in the field |
| Doubled quote | quoted lookahead | Append one quote and advance once |
| Unterminated quote | open state at EOF | Throw; return no partial grid |
| Short cells | index validation | Preserve empty-cell fallback/normalization |
| Test-count mismatch | xcresult inventory | Fail even if command exits 0 |
| Camera timeout | 120-second ceiling | Diagnose, one qualified retry, then fix/stop |
| Simulator boot failure | bootstatus | One shutdown/boot retry, then stop |
| CI billing locked | stable run annotation | Terminal external BLOCKED; no poll/repush |
| Dirty tracked worktree | porcelain status | Preserve user work; stop on overlap |
| Secret/path leak | final diff scan | Redact before commit |

## 9. Stability and Performance

- CSV stays O(n) time/O(n) peak memory (`Array(source)` plus output); delimiter comparison is O(1). Parser state is call-local and concurrency-safe.
- Conditional camera work uses one bounded serial queue per model, no detached unowned tasks or unbounded retries. Stop remains idempotent.
- Runs are bounded: CSV before/after, at most two camera attempts before and two after a fix, one full scheme plus one infrastructure-only retry.
- Evidence is constant-size. Temporary results are cleaned only after summaries are captured.

## 10. Testing Strategy

- **Unit:** BOM/CRLF audit fixture; LF/CRLF endings; terminal delimiter; blank lines; quoted LF/CRLF; doubled quotes; unterminated quotes; import counts/headers.
- **Parity:** unchanged JavaScript fixture and matching semantic native fixtures.
- **Camera:** bounded async start, non-running simulator state, authorization mapping, zero audio inputs/outputs.
- **Integration:** complete native scheme on iOS 26.4 iPad, both targets and expected methods from structured results.
- **Regression:** all baseline web tests, Playwright, formatting, install, build; record actual additive counts.
- **Documentation:** truthful PASS/BLOCKED terms, stable IDs, no paths/secrets, manifest-only diff.

## 11. Environment and Toolchain

- Xcode 26.4 (`17E192`), iOS 26.4 (`23E244`), iPad (A16) simulator `A155995F-EC83-41BE-95B2-1A5F390ABF59` are installed.
- Remote is `daniqan/check-in-007`, branch `master`, and Cycle-11 target is published.
- CI pins Node 24.20.0. Local sanctioned gates use Node 26.3.0/npm 11.16.0 without host changes.
- Locked versions remain Playwright 1.62.1, Prettier 3.9.6, acorn 8.18.0. No dependency/project-format change.

Fresh-clone web setup is `npm ci`; Xcode resolves the checked-in project without a package manager.

## 12. Deployment, Distribution, and Rollback

No deployment occurs. Commit parser/test/evidence changes normally; publication is outside scope because billing/remote execution are operator-controlled. Roll back with `git revert`. No migration or persistent rewrite occurs; the fix affects future imports and failed imports remain non-partial.

## 13. Open Questions and Decision Gates

1. Does the camera suite pass after eliminating the CSV-induced crash? The isolated run decides; camera production changes require reproduction.
2. Will GitHub billing be cleared? This is non-blocking here. CI remains terminally `BLOCKED (external billing)` until separately cleared and verified.

Neither permits scope expansion. Billing remediation requires operator action and a later verification cycle.

## 14. Completion Checklist

- [ ] Swift parsing returns two correct rows for the audit fixture and all parity regressions pass.
- [ ] CSV failure reporting cannot cause a secondary out-of-range crash.
- [ ] Camera tests complete within bounds; any reproduced stall is fixed and privacy invariants pass.
- [ ] Full native scheme passes on iOS 26.4 iPad with both targets, expected methods, and zero failures.
- [ ] Web install, formatting, unit, Playwright, and build gates pass with recorded counts.
- [ ] Evidence/README record native PASS and CI `BLOCKED (external billing)`, identify exact SHAs/run, contain no secret/path/placeholder, and stay within the manifest.

Every checkbox is required. This cycle closes the native defect without laundering CI failure into success; a future exact-SHA successful CI run may upgrade that disposition separately.
