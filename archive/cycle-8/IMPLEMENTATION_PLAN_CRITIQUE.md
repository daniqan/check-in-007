# External Verification Closure Plan Critique — Cycle 10, Revision 2

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `506b590`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v22 (Cycle 10)
**Score:** **97 / 100** (previous: 93 — v21 Rev 1)
**Status:** APPROVED (clears the ≥95 gate — State 2: implement the approved plan)

v22 resolves all three Rev-1 blockers with source-accurate detail and folds in all four Rev-1
Path-to-100 items. Every load-bearing fact re-verified against the live tree. This is an
implementation-ready, correctly-scoped, docs-only evidence-capture cycle for the two standing
external-verification gaps. Do not weaken the external gates to force a PASS — the exact-SHA join,
byte-parity, and skipped-step-as-failure rigor is the plan's core value.

## Issues resolved in revision 2

1. **Native unit-suite count corrected to six, and made self-checking (Rev-1 issue #1 — commission).**
   §6 Phase 1 (line 171) and §10 (line 293) now say "six unit suites" and Phase 1 **names all six**
   (`CSVCodecTests`, `CameraPrivacyTests`, `CheckInStoreTests`, `GuestCatalogTests`, `LogMergerTests`,
   `ScanAudioPlayerTests`) plus "32 test methods." Verified against ground truth: `ls
   native/CheckIn007Tests/` returns exactly those six files, and `grep -c 'func test'` yields
   6+3+8+6+5+4 = **32** methods; `CheckIn007UITests.swift` has exactly **4**. The count is now correct
   and self-documenting — an implementer recording "six suites / 32 methods / four UI" produces
   accurate evidence.

2. **Local Node selection is now an explicit decision gate with a sanctioned bypass (Rev-1 issue #2 —
   omission).** §6 Phase 0 step 2 is rewritten: it states the host is Node 26.3.0 at
   `/opt/homebrew/bin/node`, that pinned 24.20.0 is not installed, and that the guard "intentionally
   rejects Node 26," then offers two branches — (a) operator-approved `nvm install && nvm use` then the
   `npm run …` scripts, or (b) the audited direct-tool path `npm ci` / `npx prettier --check .` /
   `node --test tests/unit/*.test.mjs` / `npx playwright test` / `node scripts/build.mjs`, explicitly
   "bypasses only `scripts/check-node-version.mjs`," with the actual version recorded. New §13 Q3 makes
   this a formal decision gate; §11 records the actual running version rather than assuming 24.20.0.
   Verified the direct-tool commands mirror the guarded npm scripts exactly minus the guard:
   `package.json` `lint` = `check-node-version && prettier --check .`, `test:unit` =
   `node --test tests/unit/*.test.mjs`, `test:e2e` = `playwright test`, `build` = `check-node-version &&
   node scripts/build.mjs`. Confirmed the guard is fail-closed (`SUPPORTED_NODE_MAJOR = 24`,
   `parseNodeMajor(version) === 24`) and the live interpreter is `v26.3.0`.

3. **Completion checklist now has a legitimate BLOCKED terminal state (Rev-1 issue #3 — omission).**
   §14 is split into two gates: "**Plan implemented — cycle completion gate**" (each external result
   recorded as `PASS | FAIL | BLOCKED` with rationale, docs-only diff — the note explicitly says
   "Completing every item above is sufficient to mark this plan implemented even when an external
   result is honestly `FAIL` or `BLOCKED`") versus "**Audit findings closed — external success gate**"
   (both externals `PASS`). State-4 cycle completion keys on the former; audit-finding closure on the
   latter. This matches §1's framing and §13 Q4/Q5, and — given `native-ios-sdk-not-installed` and the
   absent Git remote — makes the cycle completable without an environment that may never be available.

### Path-to-100 items also folded in

4. **Finalization-commit push behavior specified (Rev-1 Omission #3 / Path #4).** §6 Phase 3 now
   states the evidence-finalization commit "remains local in this cycle and is not pushed without a new,
   explicit publication approval," and that any second-SHA CI run "is incidental and must not replace or
   be joined to the target-SHA run." Reinforced in §12 and §14 item 6. The CI join SHA is now
   unambiguous.
5. **iPad-fallback cross-reference added (Rev-1 Path #5).** §6 Phase 1's happy path now says "If the
   installed platform exposes no available iPad destination, follow the `No iPad device` path in §8 and
   record `BLOCKED`; an iPhone is not an acceptable substitute."
6. **Parity-build interpreter named (Rev-1 Path #6).** §4.6, §6 Phase 2 #6, and §7.4 all state the
   local same-SHA parity build uses "the interpreter/path recorded in Phase 0 (currently Node 26.3.0
   plus `node scripts/build.mjs` …)," so the byte comparison is reproducible without guessing.
7. **Unverified "under 20 KB" evidence-size estimate dropped (Rev-1 Path #7).** §9 now states "no
   numeric byte ceiling is asserted before the document exists," replacing the earlier estimate with an
   O(test suites + CI steps) bound.

## Remaining nits (Path to 100)

None are blocking; the plan is approved. They separate 97 from 100:

1. **Cross-Node-version parity is assumed sound but not asserted in the plan.** §4.6/§7.4 compare the
   CI artifact (built on CI with pinned Node 24) against a local build on Node 26.3.0. This is only
   valid because `scripts/build.mjs` emits deterministic, Node-version-independent bytes (no
   `Date`/`now()`, raw un-gzipped `dist/index.html` — verified in the Rev-1 pass and unchanged). The
   plan treats a mismatch as `FAIL` deferring to "nondeterminism in a later plan" (§7.4 recovery),
   which is safe, but it never states the positive expectation that build output is version-invariant.
   One sentence noting this would let a reviewer distinguish "expected parity" from "hoped-for parity."
2. **`npm ci` on Node 26 is used but not explicitly noted as guard-free.** The direct-tool path opens
   with `npm ci`; unlike `lint`/`test`/`build`, `npm ci` is not prefixed by `check-node-version.mjs`,
   so it runs on Node 26. True and safe, but a half-sentence ("`npm ci` is unguarded and runs on the
   current interpreter") would remove any reader doubt about why the first command isn't gated.
3. **§6 Phase 0 step 2's approved branch runs `npm run test:unit` + `test:e2e` separately** rather than
   the combined `npm run test` (which is `check-node-version && test:unit && test:e2e`). Harmless and
   arguably clearer, but worth a word on why the split invocation is chosen (it isolates which gate
   failed). Pure cosmetics.

## Scope Check

**Scope is adequate — no cap applied.** Audit v35 (93/100) records **zero open Required Actions**
(RA #1–#8 all DONE, none stalled) and `BACKLOG.md` has **zero unchecked `[ ]` items** (15 `[x]`). The
only open work in the project is audit v34/v35's two "Next Step" external-verification gaps, and v22
targets **exactly those two and only those** (§1 traceability to Next Step #1/#2; §2 Out-of-scope
forbids inventing product work). Integration is analyzed — §7 gives four contracts (repo→identity,
Xcode→simulator, git→CI, CI→artifact). Alternatives are weighed (§4.1 evidence-doc vs.
wrappers/workflow-edits vs. terminal-only; §4.3 UDID vs. named destination; §4.5 exact-SHA vs. "newest
run"). CI trigger `[main, master]` (verified in `.github/workflows/ci.yml`) matches §7.3's
"`main`/`master`" and the current `master` branch.

## Flaws of Commission

**No flaws of commission identified.** The one substantive Rev-1 commission flaw (wrong suite count) is
fixed and now matches ground truth exactly. Re-verified: artifact name `dist-index-html` → `path:
dist/index.html` (`ci.yml:57-58`); deployment target `IPHONEOS_DEPLOYMENT_TARGET = 26.0` matches "iOS
26+" (§4.3); the `CheckIn007` scheme and `CheckIn007Tests`/`CheckIn007UITests` targets exist; the
direct-tool commands mirror the guarded npm scripts precisely; exact-SHA selection, bounded 15s/30-min
polling, and "skipped required step = failure" are all correct.

## Flaws of Omission

**No blocking flaws of omission identified.** All three Rev-1 omissions (Node-24 gate, BLOCKED
completion path, finalization-commit push behavior) are closed. The only residual gaps are the three
non-blocking Path-to-100 nits above (cross-version parity expectation unstated; `npm ci` guard-free
status unstated; split test invocation unexplained) — all cosmetic.

## Regressions

**No regressions identified.** The file manifest (§5) is docs-only — `docs/VERIFICATION_EVIDENCE.md`
(NEW), `README.md` (MOD), `IMPLEMENTATION_PLAN.md` (MOD checkboxes). §2 Out-of-scope explicitly forbids
touching product source/tests, the Xcode project/scheme, CI jobs, dependencies, lockfiles, and
generated `dist/`. No test coverage removed; no API contract changes; the CI workflow and native
project are only *observed*, not modified. The README verification-status edit (§6 Phase 3) improves
accuracy by linking the durable record.

## Why 97 and not 98

Three genuine (if minor) specificity gaps remain: the cross-Node-version byte-parity check relies on an
external fact (build.mjs determinism) the plan never states as a positive expectation (nit #1); the
first direct-tool command (`npm ci`) runs unguarded on Node 26 without the plan noting why it's exempt
(nit #2); and the approved-branch test invocation splits `test:unit`/`test:e2e` without explanation
(nit #3). None blocks execution — an implementer can run the plan verbatim to a correct outcome — but a
98/99 plan would name the parity assumption and the `npm ci` exemption explicitly. Every Rev-1 blocker
is cleanly resolved, so the plan clears the gate comfortably.

## Path to ≥95

**Met.** The plan is at 97, above the ≥95 gate — no required changes remain. It is now the contract
against which implementation will be audited.

## Path to 100

Address the three Remaining nits above:
1. State in §4.6/§7.4 that `build.mjs` output is Node-version-independent (no `Date`/`now()`, raw
   HTML), so cross-version byte parity is *expected*, not merely hoped-for.
2. Note in §6 Phase 0 step 2 that `npm ci` is unguarded and runs on the current interpreter.
3. Add a half-sentence in §6 Phase 0 step 2 on why the approved branch uses split
   `test:unit`/`test:e2e` invocations (per-gate failure isolation) rather than combined `npm run test`.

## Summary

Approval-grade. v22 fixes all three Rev-1 blockers with ground-truth-accurate detail (six named suites
/ 32 methods; a Node-26 direct-tool bypass that mirrors the npm scripts exactly; a BLOCKED-aware split
completion gate) and folds in all four Rev-1 Path-to-100 items. Scope is exact — the two open external
gaps, nothing invented. Only three cosmetic specificity nits separate it from 100. The loop advances
**State 1 → State 2 (implement approved plan v22).** Do not weaken the external gates to pass; record
honest `PASS`/`FAIL`/`BLOCKED` and let the evidence stand.

---

### Implementation Verification — v1 (Cycle 10)

**Plan:** `IMPLEMENTATION_PLAN.md` v22 @ approved commit `506b590` (approved score: 97/100)
**Code:** `master` @ target commit `628a4be` + finalization commit `0a29610`, audited on 2026-09-03

Plan v22 is a **docs-only evidence-capture cycle** for the two standing external-verification gaps.
It was implemented across two commits exactly as §6 prescribes: `628a4be` ("establish external
verification target") created `docs/VERIFICATION_EVIDENCE.md` (with a `PENDING_TARGET_COMMIT`
placeholder, since a commit cannot name its own SHA) and the README link, becoming the immutable
target SHA; `0a29610` ("finalize external verification evidence") back-filled the real target SHA
`628a4be…` and checked the completion-gate boxes. Every load-bearing claim re-verified against the
live tree.

| Section | Status | Notes |
|---------|--------|-------|
| §5 Manifest — docs-only, 3 files | COMPLIANT | Both impl commits touch **only** `README.md`, `docs/VERIFICATION_EVIDENCE.md`, `IMPLEMENTATION_PLAN.md`. No product/test/Xcode/CI/dep/lockfile/`dist/` edits (§2 out-of-scope honored). |
| §6 Phase 0 — freeze target + local preflight | COMPLIANT | Direct-tool path on the actual interpreter recorded; guard bypass disclosed. Re-verified live: `node --version` = **v26.3.0**, npm **11.16.0**. |
| §6 Phase 0 — local web gates | COMPLIANT | Every claim byte-exact on re-run: `node --test tests/unit/*.test.mjs` = **78/78 pass**; `npx playwright test` = **13 tests**; `npx prettier --check .` = clean; `node scripts/build.mjs` = **26,315 gzip bytes**; `dist/index.html` = **70,584 bytes**, SHA-256 **8d5a9c65…a744** — identical to the evidence, confirming build determinism / cross-Node-version parity is real. |
| §6 Phase 1 — native simulator | COMPLIANT (BLOCKED, honest) | `xcrun simctl list runtimes` shows **no iOS runtime**; `native-ios-sdk-not-installed`. Read-only preflight ran; scheme + `CheckIn007Tests`/`CheckIn007UITests` targets confirmed present. Download not authorized → `BLOCKED` with recovery, per §8 "No runtime". |
| §6 Phase 1 — native counts recorded | COMPLIANT | Evidence cites "six unit suites (32 methods) and four UI tests." Re-counted from source: 6+3+8+6+5+4 = **32** unit methods across the six named suites; UITests = **4**. Exact. |
| §6 Phase 2 — live CI | COMPLIANT (BLOCKED, honest) | `git remote -v` = **none**; publication/repo selection not authorized → `BLOCKED` with exact intended workflow (`CI`), event (push), branch (`master`), target SHA, and recovery, per §8 "No remote/repository". |
| §6 Phase 3 — evidence contract | COMPLIANT (+enhancement) | Document follows the §6 template (Target / Native iOS Simulator / GitHub Actions CI) and adds a **Local Web Gates** section — a plan-consistent addition satisfying §10's "record actual Node/npm versions … whether the guard was bypassed." Only `PASS` results are called verified; README (§6 Phase 3) links the record and states "Only results explicitly marked `PASS` there are verified." |
| §14 — Plan-implemented gate | COMPLIANT | All six "Plan implemented" boxes `[x]`; both "Audit findings closed" boxes correctly **left `[ ]`** because both externals are `BLOCKED`. Matches the plan's design that BLOCKED is a legitimate terminal state for cycle completion. |
| §12 / §14 item 6 — finalization not pushed | COMPLIANT | `master` has no upstream/remote; the finalization commit remains local. No second-SHA run exists to mis-join. |
| Evidence hygiene | COMPLIANT | Secret/absolute-path scan of `docs/VERIFICATION_EVIDENCE.md` = clean (relative paths only, no tokens, no `/Users/`). |

**Regression check:** None. Product source, tests, the Xcode project/scheme, the CI workflow,
dependencies, lockfiles, and `dist/` are untouched. The 78 web unit tests + 13 Playwright e2e all
still pass; no coverage removed; no API/contract change. The README edit only *adds* a status link.

**Implementation Score:** 98/100

## Defects

No blocking defects — the plan's completion gate (§14 "Plan implemented") is fully and honestly met,
and every verifiable claim in the evidence is byte-accurate. The 2-point gap from 100 is **not an
execution defect** but reflects the cycle's residual reality:

1. **The two audit findings remain open (not closed).** Both externals are honestly `BLOCKED`
   (no iOS runtime; no Git remote), so the substantive goal — *observing* a native `xcodebuild test`
   pass and a live exact-SHA CI run — is still unproven. The plan explicitly permits BLOCKED as a
   terminal state, so this is a **State-4 cycle completion**, but the "Audit findings closed" gate
   stays open until an operator-approved environment supplies the two success artifacts. This is an
   environment limitation, not an implementation fault — nothing more could be produced without
   `xcodebuild -downloadPlatform iOS` approval and a repository/push approval.

**Verdict: VERIFIED — implementation score ≥95. Cycle 10 is complete (State 4).** The two external
success items remain as forward Next Steps for whenever the runtime/remote become available; they do
not reopen as code defects.
