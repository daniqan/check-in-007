# HTTPS Helper API Precision & CLI Docs Plan Critique — Cycle 9, Revision 1

**Reviewed:** `IMPLEMENTATION_PLAN.md` @ commit `12857d2`
**Plan Under Review:** IMPLEMENTATION_PLAN.md v20 (Cycle 9)
**Score:** **96 / 100** (first review of v20)
**Status:** APPROVED (≥95 gate cleared)

Plan v20 is a tight, correctly-scoped follow-up that resolves exactly the two cosmetic
polish items recorded in Consolidated Audit v32's *Next Step* — document/test `--bind`,
and return an effective advertised endpoint instead of a hard-coded `127.0.0.1`. Every
load-bearing claim was re-verified against the live tree. It clears the gate on the first
review; the single notable gap is that it under-specifies a *breaking* change to one
existing live-request test.

## Source verification

All plan premises confirmed against `HEAD`:

- `parseArgs` maps `--bind` → `options.host` (`scripts/serve-https.mjs:27`); `--host` is
  repeatable into `options.hosts` (`:24`). The plan's bind-vs-host distinction is real.
- `startServer` returns `url: \`https://127.0.0.1:${actualPort}\`` unconditionally
  (`scripts/serve-https.mjs:86`) — the exact defect the plan targets.
- `certHosts = [...new Set(['localhost', '127.0.0.1', ...lanAddresses, ...hosts])]`
  (`:59`) — the plan's `bindCertHosts` splice point is accurate.
- `lanUrls`/`lanIpv4Addresses` exist and sort (`:35-48`); the plan preserves both.
- `main()` currently derives its own `urls` from `result.lanUrls` with a localhost
  fallback (`:98`) and prints `urls[0]` for the cert route (`:102`).
- Implementation is entirely absent (Implementation Score N/A): no `urls` field, no
  `advertisedUrls`/`httpsUrl` exports, `serve-https.test.mjs` has no `--bind`/`urls`
  coverage (67 lines, unchanged), and `README.md` has no flag table.

## Scope Check

Adequate — **no cap applied**.

- **Audit findings in scope:** Audit v32 records exactly two open in-scope polish items
  (Next Step #1 `--bind` doc/test, #2 `startServer().url` precision). The plan addresses
  **both**, and only those. Required Actions #1–#8 are all DONE / none stalled.
- **Backlog:** fully closed at v32 (0 unchecked `[ ]`). Nothing else is in scope.
- **Correctly deferred:** the two standing external-verification gaps (native
  `xcodebuild … test` with no iPadOS runtime; the unobserved first live CI run) are
  environment-blocked, not local code defects — the plan defers them explicitly (§1, §2
  Out of scope, §13 Q4), which is the right call.
- **Integration analyzed:** §7 maps four contracts (parser→listener, listener→metadata,
  endpoint→SAN, CLI stdout). **Alternatives considered:** §4 + §13 justify keeping
  `--bind`, keeping `url`, adding `urls`, and *not* doing IPv6 discovery / local bind
  validation.

## Flaws of Commission

1. **None gate-blocking.** The `URL.hostname`/`isIP` IPv6-bracketing approach (§4.4) is
   correct — raw `::1` assignment to `URL.hostname` is indeed dropped by WHATWG parsing
   while `[::1]` serializes. Recognizing only `0.0.0.0`/`::` as wildcards (§6 Phase 1) is
   correct. Filtering wildcards out of the SAN (§4.5) is correct — a wildcard is never a
   valid SAN identity.

## Flaws of Omission

1. **[Moderate — top item] The existing live-request test's rebind is not called out as
   a breaking change.** `tests/unit/serve-https.test.mjs:53-67` binds the **default
   wildcard** with an *injected* LAN interface (`192.168.50.7`) and then issues live
   HTTPS GETs through `result.url` (lines 62–66: home 200, `/.certs/key.pem`→404,
   traversal→404). Today those pass because `result.url` is loopback, which the machine
   really listens on under `0.0.0.0`. **Under this plan, wildcard-with-LAN makes
   `result.url = https://192.168.50.7:<port>` — an address the test host is not actually
   bound to — so every live GET in that test would hang or `ECONNREFUSED`.** The plan's
   Phase 2 (#3/#4 "live server bound to `127.0.0.1`", #5 "wildcard … asserts `urls`,
   `url`, and `lanUrls`" — assertion only) *describes the correct end state*, so a careful
   implementer arrives at the right structure. But the plan never states that this
   specific existing test must be **rebound to an explicit `127.0.0.1`** for its live
   requests (with the wildcard case demoted to value-assertions only). Spell this out in
   §6 Phase 2 or §10 so the implementer cannot naively leave the live GETs on the wildcard
   bind. This is the one place the plan risks producing a hanging/failing suite.

2. **[Minor] `main()` reconciliation is described in §7.4 but not assigned to a Phase.**
   §7.4 says `main` "should consume `result.urls`", but §6 Phase 2 only edits the
   `startServer` return; no phase step updates `main()` (`:98`,`:102`) to use
   `result.url`/`result.urls`. Behavior is unchanged for wildcard (result.urls ==
   lanUrls-or-localhost), so this is not a correctness gap — but leaving `main` with its
   own parallel endpoint logic while `startServer` grows the canonical one invites future
   drift. Fold the `main()` edit into Phase 2 explicitly, or state that `main` is
   intentionally left as-is.

## Regressions

1. **Intended, and correctly bounded.** The only behavioral change is `url` for a
   wildcard bind with ≥1 LAN IPv4 flipping from loopback to the first sorted LAN URL —
   which *is* audit polish #2. No field is removed or retyped (`url` stays a string,
   `lanUrls` retained, `urls` additive; §4.3, §7.2). Default-wildcard cert SAN is
   unchanged (`bindCertHosts=[]` for wildcards, §4.5), so existing default users see **no**
   certificate regeneration — only explicit-bind users may see one, which §7.3/§12
   acknowledge with a re-trust note. The one at-risk artifact is the existing live test
   (Omission #1); no production regression.

## Why 96 and not 97

The plan is genuinely thorough (13 sections, an 11-row error table, four integration
contracts, rollback, answered open questions, a completion checklist), and its technical
core is correct. It is held one point below 97 by Omission #1: an existing live-request
test is silently made unreachable by the very change the plan introduces, and the plan
relies on the implementer inferring the rebind rather than stating it. That is exactly the
class of under-specification that produces a broken suite on first implementation, so it
costs a full point even though the correct end state is described elsewhere.

## Path to ≥95

Already ≥95 (APPROVED). No blocking items.

## Path to 100

1. **(from Omission #1)** In §6 Phase 2 / §10, state explicitly that the current
   default-wildcard live-request test must be **rebound to `--bind`/`host: '127.0.0.1'`**
   (so `result.url` is loopback-reachable), and that the injected-LAN wildcard case
   becomes an **assertion-only** test (`url`/`urls`/`lanUrls` values, no live GET). Name
   the existing lines being restructured.
2. **(from Omission #2)** Assign the `main()` edit to Phase 2 (consume `result.url` /
   `result.urls`) or explicitly declare `main` unchanged.
3. **IPv6 wildcard `::` reachability.** §6 advertises LAN **IPv4** URLs (or localhost) for
   a `::` bind. On a v6-only (`IPV6_V6ONLY`) listener those IPv4 URLs would not connect,
   and the localhost fallback may not either. Add one line noting this is best-effort for
   the dual-stack default and that IPv6 interface discovery is deliberately out of scope
   (§13 Q1 gestures at this but not at the reachability caveat).
4. **Explicit-but-unavailable bind.** §8 routes an unavailable explicit bind through
   Node's `listen` error, but there is no test asserting that path (e.g. binding an
   address not on the host → startup rejects). A single negative test would make §7.1's
   "Node is authoritative" claim executable rather than asserted.
5. **`httpsUrl` throw contract.** §6 says "invalid URL inputs throw" — add a pure-helper
   test asserting the throw so the contract is enforced, not just documented.

## Summary

Approval-grade at **96/100**. v20 resolves both open audit polish items with a correct,
additive, backward-compatible API change, adequate scope, and no gate-blocking flaws. The
one thing keeping it from a higher score is that it under-specifies a breaking rebind of an
existing live-request test — the correct end state is described in Phase 2/§10 but never
flagged as a migration, so an implementer could leave live GETs pointed at an unreachable
injected LAN IP. Loop advances **State 4 → State 2 (implement approved plan v20)**. The
plan is now the contract; land the code and fold the five Path-to-100 items in during
implementation rather than re-revising.

---

**Plan Score:** 96/100
**Implementation Score:** N/A
**Current Score**: 92/100
