# External Verification Closure Plan Critique — Cycle 10, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `49be77d`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v21 (Cycle 10)
**Score:** **93 / 100** (first review of v21)
**Status:** NOT APPROVED (below the ≥95 gate — State 1: revise the plan)

An exceptionally rigorous evidence-capture plan for the two standing external-verification gaps
(native `xcodebuild … test` unrun, GitHub Actions CI first live run unobserved). Approval gates,
exact-SHA joins, artifact byte-parity, and error taxonomy are all strong. It is held below the gate
by three concrete, mechanically-fixable items: a wrong native unit-suite count in an evidence-fidelity
plan, a silent assumption that pinned Node 24 is runnable locally (it is not — this machine is Node
v26.3.0 and the guard fails closed), and a completion checklist that admits no BLOCKED terminal state
even though the plan's own design treats BLOCKED as legitimate.

## Remaining issues

1. **Wrong native unit-suite count — "five unit suites" is actually six.** §6 Phase 1 (line 157) and
   §10 (line 272) both instruct the implementer to record/verify "five unit suites and four UI tests."
   `native/CheckIn007Tests/` contains **six** test suite files — `CSVCodecTests`, `CameraPrivacyTests`,
   `CheckInStoreTests`, `GuestCatalogTests`, `LogMergerTests`, `ScanAudioPlayerTests` (32 `func test`
   methods total). The project uses an Xcode file-system-synchronized root group (no per-file
   membership list in `project.pbxproj`), so all six compile into the test target. "Four UI tests" is
   correct (`CheckIn007UITests.swift` has exactly four `func test` methods). For a cycle whose sole
   deliverable is *accurate, durable evidence*, an expected count that is off by one is a
   self-defeating defect: an implementer who records "five suites discovered" produces false evidence,
   and an acceptance criterion demanding "all five" mis-describes the passing state. *Fix:* change
   "five unit suites" to "six unit suites" in §6 Phase 1 and §10 (or, better, state the exact suite
   names so the count is self-checking).

2. **Local pinned-Node-24 availability is assumed, not gated — and it is false on this machine.**
   §6 Phase 0 step 2 says "On pinned Node 24.20.0 run `npm ci`, `npm run lint`, `npm run test:unit`,
   `npm run test:e2e`, and `npm run build`," §14 item 1 makes "Local Node 24 gates pass" an acceptance
   criterion, and §11 lists "Node 24.20.0" as if present. But the running interpreter here is **Node
   v26.3.0** (`/opt/homebrew/bin/node`), there is **no nvm Node 24 installed** (`~/.nvm/versions/node`
   absent), and every one of those `npm run` scripts is prefixed by `node scripts/check-node-version.mjs`,
   whose guard requires `major === 24` and **exits non-zero on any other major** (`SUPPORTED_NODE_MAJOR
   = 24`). As written, Phase 0 step 2 — the very first gate, and the immutable-target-SHA commit
   depends on it — fails closed on this machine before any external work begins. Every prior cycle
   (v6/v8/v9 verifications, audit v34) explicitly worked around this via a plan-sanctioned "§6/§5
   direct-tool path" (`node --test tests/unit/*.test.mjs`, `npx playwright test`, `node scripts/build.mjs`
   run directly, bypassing the guard) and repeatedly documented pinned Node 24 as "env-blocked." This
   plan gives the iOS runtime and the git remote careful operator-approval gates but is silent on the
   equally-blocking Node-24 prerequisite. *Fix:* add a Node-24 branch parallel to §13 Q2 — either (a)
   require operator-approved installation of Node 24.20.0 (nvm) as a named preflight/decision gate, or
   (b) sanction the same direct-tool bypass prior cycles used, and rewrite §6 Phase 0 step 2 + §14 item
   1 so the guard-gated `npm run build` is replaced by the direct `node scripts/build.mjs` invocation
   (note the guard cannot pass on Node 26, so "pinned Node 24 gates pass" as literally worded is
   unsatisfiable here). §11's "Node 24.20.0" line should record the *actual* running version and the
   chosen path, not an aspirational one.

3. **Completion checklist has no BLOCKED terminal state, risking an unsatisfiable gate.** §14's seven
   checkboxes all assert PASS/success ("native unit/UI tests pass," "Exact-SHA CI run and every
   required step succeed," "CI artifact is byte-identical"). Yet the plan's own design (§3, §6 Phase 1
   line 157, §6 Phase 3, §8, §13 Q4) explicitly treats `BLOCKED` as a legitimate recorded outcome when
   the operator withholds platform-download / remote approval or the environment can't run the check —
   and given `native-ios-sdk-not-installed` and the absent git remote, `BLOCKED` is the *likely*
   outcome. As written there is no way to mark the cycle's implementation "done" without both external
   PASSes, which the environment may never permit, so the plan can be fully and correctly executed yet
   never satisfy its own completion criteria. *Fix:* split §14 into (a) "plan implemented" acceptance —
   the durable evidence scaffold exists, local gates ran, and each external gate is recorded as one of
   PASS/FAIL/BLOCKED with rationale, the diff is docs-only — versus (b) "audit findings closed" —
   both external gates PASS. Cycle completion (State 4) should key on (a); audit-finding closure on (b).
   This mirrors §1's own framing ("without changing application behavior") and §13 Q4.

## Scope Check

**Scope is adequate — no cap applied.** Audit v34 (94/100, State 4) records **no open Required
Actions** (RA #1–#8 all DONE, none stalled) and `BACKLOG.md` has **zero unchecked `[ ]` items**. The
only open work items in the entire project are audit v34's two "Next Step" external-verification
gaps, and this plan targets **exactly those two and only those** (§1 traceability to Next Step #1/#2).
No applicable audit finding or backlog item is ignored. Integration is analyzed (§7 gives four
contracts: repo→identity, Xcode→simulator, git→CI, CI→artifact). Alternatives are weighed (§4.1
evidence-doc vs. wrappers/workflow edits vs. terminal-only; §4.3 UDID vs. named destination; §4.5
exact-SHA vs. "newest run"). The plan correctly refuses to invent product scope (§1, §2 Out of scope).

## Flaws of Commission

1. **The "five unit suites" count is factually wrong (six exist).** See Remaining issue #1. This is
   the one substantive commission flaw — a hardcoded number that the ground-truth tree contradicts,
   in a plan whose entire purpose is factual evidence.

No other flaws of commission: `dist-index-html` artifact name and `path: dist/index.html` match
`.github/workflows/ci.yml:57-58`; deployment target `IPHONEOS_DEPLOYMENT_TARGET = 26.0` matches the
"iOS 26+" requirement (§4.3); the shared `CheckIn007` scheme and the `CheckIn007Tests`/
`CheckIn007UITests` target names exist; `build.mjs` has no `Date`/`now()` and emits the raw
(un-gzipped) `dist/index.html`, so the §4.6 byte-parity check is deterministic and Node-version-robust
(the gzip is size-budget-only). Exact-SHA CI selection, bounded polling, and "skipped required step =
failure" are all correct.

## Flaws of Omission

1. **No Node-24 acquisition/bypass gate** (Remaining issue #2) — the plan gates the iOS runtime and
   git remote but omits the equally-blocking local Node-24 prerequisite, which is false on this machine.
2. **No BLOCKED completion path** (Remaining issue #3) — §14 cannot terminate the cycle when an
   external gate is legitimately BLOCKED, though the rest of the plan treats BLOCKED as valid.
3. **Two commits, one SHA — evidence-vs-target commit relationship under-specified for the CI join.**
   §6 Phase 0 step 4 makes the docs-BLOCKED commit the "immutable target SHA" that Phase 2 pushes and
   CI runs against; §6 Phase 3 then adds a *second* finalization commit ("do not amend the pushed
   target commit"). This is internally consistent, but the plan never states that the finalization
   commit is **not** pushed (or, if it is, that CI will fire a *second* run on a different SHA that
   must be ignored). *Fix:* one sentence in §6 Phase 3 / §12 stating whether the finalization commit is
   pushed and, if so, that its CI run is not the join target.

## Regressions

**No regressions identified.** The file manifest (§5) is docs-only — `docs/VERIFICATION_EVIDENCE.md`
(NEW), `README.md` (MOD), `IMPLEMENTATION_PLAN.md` (MOD checkboxes). §2 Out-of-scope explicitly
forbids touching product source/tests, the Xcode project/scheme, CI jobs, dependencies, lockfiles,
and generated `dist/`. No test coverage is removed; no API contract changes; the existing CI workflow
and native project are only *observed*, not modified. The README verification-command edit (§6 Phase
3) improves accuracy (links the durable record) rather than degrading it.

## Why 93 and not 94

Two of the three issues are genuine execution blockers rather than polish: the "five suites" count
(#1) directly corrupts the cycle's sole deliverable — accurate evidence — and the Node-24 assumption
(#2) breaks Phase 0, the first gate, on the actual machine. The BLOCKED-completion gap (#3) is a real
consistency defect but lower-impact. Together they are worth −7 from an otherwise near-exemplary plan.
Had only the count and completion-gap issues remained, this would sit at ~96; the live, verified
Node-24 blockage is what holds it firmly below the gate.

## Path to ≥95

Address all three in one revision pass:

1. Fix the native unit-suite count to **six** in §6 Phase 1 (line 157) and §10 (line 272) — ideally by
   naming the six suites so the number is self-checking.
2. Add an explicit local-Node-24 gate: either an operator-approved nvm install of 24.20.0 as a named
   §13 decision gate, or sanction the direct-tool bypass (`node --test …`, `npx playwright test`,
   `node scripts/build.mjs`) and rewrite §6 Phase 0 step 2 + §14 item 1 accordingly, recording the
   actual running Node version in §11 rather than assuming 24.20.0 is present.
3. Split §14 into "plan implemented (evidence recorded as PASS/FAIL/BLOCKED, docs-only diff)" vs.
   "audit findings closed (both external gates PASS)," and key cycle completion on the former.

## Path to 100

Beyond the ≥95 items:

4. Specify the finalization-commit push behavior (Omission #3) so the CI join SHA is unambiguous.
5. §6 Phase 1 assumes an iPad simulator can be selected after `-downloadPlatform iOS`; state the
   fallback if the downloaded platform ships only iPhone runtimes on this Xcode build (§8 already has
   "No iPad device → BLOCKED," but Phase 1's happy-path narrative should cross-reference it).
6. §4.6/§6 Phase 2 #6 should name *where* the local same-SHA parity build runs (same interpreter as the
   local gates) so a reviewer can reproduce the byte comparison without guessing the Node line.
7. Quantify the "under 20 KB" evidence-size claim (§9) against the actual §3 contract template, or drop
   the number — it is currently an unverified estimate.

## Summary

Not approval-grade yet, but close and structurally excellent. Three mechanically-fixable items hold it
at 93: a wrong native suite count (six, not five) that undermines an evidence-fidelity cycle; a silent,
false assumption that pinned Node 24 runs locally when the machine is Node 26 with a fail-closed guard;
and a completion checklist with no BLOCKED terminal state despite the plan's own BLOCKED-aware design.
Fix those three and this reaches ≥96 comfortably. Do not weaken the external gates to pass — the
rigor there is the plan's strength.

---

*Implementation Verification: N/A — nothing implemented for Cycle 10. `docs/VERIFICATION_EVIDENCE.md`
does not exist; the plan is not yet approved, so implementation has not begun.*
