# Check-In 007 — Implementation Plan v16

> Cycle 6 backlog plan. Source item: `BACKLOG.md` Deferred Features item
> "Native SwiftUI iPad build as a maximum-fidelity alternative (§10 Q1)", now marked in
> progress as `- [/]`. This plan intentionally does not include the separate
> "On-device static-HTTPS helper" backlog item.

## 1. Overview

This cycle adds a native SwiftUI iPad build that mirrors the existing static web kiosk
for operators who want maximum iPad fidelity without depending on Safari camera and web
storage behavior. The current web app remains supported and unchanged; the native app is
an alternative client that preserves the same roster, theatrical scan, admin controls,
export formats, audio privacy posture, and event-log semantics. The implementation must
be shippable from the repository with Xcode and testable without requiring App Store
distribution.

## 2. Scope

### In Scope

1. Add a native iPadOS SwiftUI app under `native/CheckIn007/`.
2. Commit an Xcode project under `native/CheckIn007.xcodeproj/` with app, unit-test, and
   UI-test targets.
3. Port the core domain contracts from the web app: guest normalization, folded search,
   duplicate-name dropping, stable generated IDs, check-in log append idempotency by
   visit ID, CSV/JSON export, CSV roster import, and multi-device log merge.
4. Provide a native camera-preview scan screen using AVFoundation video input only; do
   not capture, store, transmit, or process frames.
5. Provide optional default-off scan blip audio gated by an explicit admin setting and
   user interaction.
6. Preserve operator workflows: roster search, guest selection, loading/scan/result
   progression, hidden admin entry, roster import/reset, log export/copy/share,
   merge preview/apply, clear-log confirmation, and audio setting toggle.
7. Add native unit tests and UI smoke tests covering core behavior, privacy boundaries,
   accessibility labels, and persistence/export contracts.
8. Document native build/test/run instructions in `README.md`.

### Out Of Scope

- Removing, replacing, or behaviorally changing the existing web app.
- Implementing the offline static-HTTPS helper backlog item.
- Adding CI workflow files.
- App Store signing, provisioning profile management, TestFlight setup, or paid Apple
  Developer Program enrollment.
- iPhone-specific layout optimization beyond adaptive SwiftUI constraints that prevent
  crashes or overlap.
- Cloud sync, networking, external databases, QR/barcode scanning, or real biometric
  capture.

## 3. Architecture

The native app is a separate SwiftUI target with shared concepts, not shared runtime
code. The web app continues to build from `index.html`, `src/`, and `scripts/build.mjs`.
The native app consumes a generated JSON copy of the default guest roster and persists
operator state locally on the device.

```text
data/guests.default.js
  -> scripts/export-native-guests.mjs
  -> native/CheckIn007/Resources/default-guests.json

CheckIn007App
  -> AppModel (@MainActor observable state coordinator)
  -> GuestCatalog + SearchNormalizer
  -> CheckInStore
       -> UserDefaults: roster override + audio settings
       -> Documents/check-in-007-log.json: event log
  -> SwiftUI screens
       -> LoadingView -> RosterView -> ScanView -> ResultView
       -> AdminSheet
  -> CameraPreviewModel / CameraPreviewView (AVFoundation preview only)
  -> ScanAudioPlayer (default-off synthesized cue)
```

Failure domains:

- Roster parsing failures affect only the imported roster and leave the existing roster
  intact.
- Log read/write failures surface as admin status errors and keep in-memory state for
  the current session when possible.
- Camera authorization denial or camera startup failure falls back to the existing
  "covert mode" theatrical state.
- Audio engine startup failure disables the cue for the current attempt without blocking
  check-in.
- Native build/test failures must not alter the web app validation path.

## 4. Technical Decisions & Rationale

1. **Use SwiftUI on stable Xcode 26, not Xcode 27 beta.** Apple documents Xcode 26 as
   including Swift 6.2 and SDKs for iPadOS 26, while the current Xcode 27 line is beta
   as of 2026-09-02. A beta-only project was considered, but this kiosk should build on
   the stable public toolchain used for event operations.
   Source: https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes

2. **Commit a plain Xcode project instead of introducing Tuist/XcodeGen.** Third-party
   project generators reduce `.pbxproj` hand editing, but they add bootstrap tooling and
   version policy to a repo that currently has only npm-based web tooling. A committed
   single-app Xcode project is verbose but inspectable in Xcode, requires no extra
   install step, and keeps the native track independent from Node.
   **Production path (not hand-authored):** the `project.pbxproj` is created by Xcode 26
   locally — File → New → Project → iOS App (SwiftUI, Swift), then add the Unit Testing and
   UI Testing targets via File → New → Target — and the Xcode-generated `.pbxproj` is
   committed verbatim. A hand-written multi-target `.pbxproj` is error-prone and a malformed
   one makes the whole cycle unverifiable, so we never author it by hand; the Swift/resource
   files listed in §5 are then added to their targets in Xcode before committing.

3. **Use SwiftUI `NavigationStack`, `List`, `sheet`, and `@Observable` app state.**
   SwiftUI is the native UI framework Apple positions for Apple-platform apps, and the
   kiosk is state-driven rather than graphics-engine-driven. UIKit was considered for
   total control, but SwiftUI reduces custom layout code and improves Dynamic Type and
   VoiceOver behavior when labels are supplied explicitly.
   Source: https://developer.apple.com/documentation/swiftui/

4. **Use AVFoundation preview-only camera integration.** `AVCaptureSession` coordinates
   camera input and preview flow, and Apple requires explicit camera authorization for
   capture access. The app will add a video device input and preview layer, but no
   photo/movie/data output, no microphone input, and no frame-processing delegate.
   `UIImagePickerController` was considered but rejected because it is capture-oriented
   and does not express the privacy boundary as clearly.
   Sources:
   https://developer.apple.com/documentation/avfoundation/avcapturesession and
   https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media

5. **Persist settings in `UserDefaults` and logs as JSON in app Documents.**
   `UserDefaults` is appropriate for small preferences and the roster override; event
   logs can grow and need explicit export/readback behavior, so they belong in a file
   managed through `FileManager` with atomic writes. SQLite was considered but rejected
   because the log is append-mostly, small for event use, and already exports as a flat
   array.
   Source: https://developer.apple.com/documentation/foundation/userdefaults

6. **Use XCTest/XCUIAutomation for native verification.** Apple documents XCTest for unit
   and UI tests, including UI automation through XCUIAutomation. Snapshot testing
   libraries were considered, but this cycle needs behavior, accessibility, persistence,
   and privacy assertions more than pixel-perfect image diffs.
   Sources: https://developer.apple.com/documentation/xctest and
   https://developer.apple.com/documentation/xcuiautomation

7. **Keep the native app visually faithful, not byte-for-byte CSS-equivalent.** Fonts,
   layout rhythm, black kiosk shell, 007 topbar, roster rows, scan copy, and admin
   workflows should match the web app's intent. Exact CSS animations are not portable to
   SwiftUI and are less important than camera reliability, hit targets, VoiceOver, and
   full-screen iPad ergonomics.

## 5. File Manifest

```text
BACKLOG.md                                             (MOD) — Mark native SwiftUI backlog item in progress.
IMPLEMENTATION_PLAN.md                                 (MOD) — Replace cycle-5 plan with this cycle-6 plan.
README.md                                              (MOD) — Add native iPad build/test/run instructions (kept Prettier-clean; README is linted).
.prettierignore                                        (MOD) — Add `native/` so Swift/plist/pbxproj/JSON are excluded from `prettier --check .`.
scripts/export-native-guests.mjs                       (NEW) — Generate native default roster JSON via the web app's own normalizeGuests.
tests/unit/native-guests-export.test.mjs                (NEW) — Verify exported native roster stays in sync with web defaults (regenerate-and-diff).
native/CheckIn007.xcodeproj/project.pbxproj            (NEW) — Xcode-GENERATED app/unit-test/UI-test project (created in Xcode 26, committed verbatim; not hand-authored — see §4.2).
native/CheckIn007/CheckIn007App.swift                  (NEW) — SwiftUI app entry point.
native/CheckIn007/Info.plist                           (NEW) — Camera usage string and iPad orientation metadata.
native/CheckIn007/Resources/default-guests.json        (NEW) — Generated default guest roster (Prettier-conformant JSON).
native/CheckIn007/Models/Guest.swift                   (NEW) — Guest model and normalization helpers.
native/CheckIn007/Models/CheckInEntry.swift            (NEW) — Log entry model and visit ID semantics.
native/CheckIn007/Models/MergeSummary.swift            (NEW) — Merge preview result model.
native/CheckIn007/Models/AudioSettings.swift           (NEW) — Default-off audio preference model.
native/CheckIn007/Services/SearchNormalizer.swift      (NEW) — Diacritic-insensitive folding and ID slugging.
native/CheckIn007/Services/GuestCatalog.swift          (NEW) — Default roster load, import validation, search.
native/CheckIn007/Services/CSVCodec.swift              (NEW) — CSV parse/export matching web edge cases.
native/CheckIn007/Services/CheckInStore.swift          (NEW) — Local persistence and export APIs.
native/CheckIn007/Services/LogMerger.swift             (NEW) — JSON/CSV log merge normalization and dedupe.
native/CheckIn007/Services/CameraPreviewModel.swift    (NEW) — Camera authorization/session lifecycle.
native/CheckIn007/Services/ScanAudioPlayer.swift       (NEW) — Optional synthesized scan cue.
native/CheckIn007/ViewModels/AppModel.swift            (NEW) — Kiosk state machine and orchestration.
native/CheckIn007/Views/LoadingView.swift              (NEW) — Native loading screen.
native/CheckIn007/Views/RosterView.swift               (NEW) — Searchable guest roster and admin hold entry.
native/CheckIn007/Views/ScanView.swift                 (NEW) — Camera/covert scan screen.
native/CheckIn007/Views/CameraPreviewView.swift        (NEW) — UIKit preview-layer bridge for SwiftUI.
native/CheckIn007/Views/ResultView.swift               (NEW) — Assignment result screen.
native/CheckIn007/Views/AdminSheet.swift               (NEW) — Import/export/merge/settings controls.
native/CheckIn007/Views/Theme.swift                    (NEW) — Shared colors, spacing, typography helpers.
native/CheckIn007Tests/GuestCatalogTests.swift         (NEW) — Guest normalization/search tests.
native/CheckIn007Tests/CSVCodecTests.swift             (NEW) — CSV parser/exporter tests.
native/CheckIn007Tests/CheckInStoreTests.swift         (NEW) — Persistence/idempotency/export tests.
native/CheckIn007Tests/LogMergerTests.swift            (NEW) — Multi-device merge tests.
native/CheckIn007Tests/CameraPrivacyTests.swift        (NEW) — Preview-only camera configuration tests.
native/CheckIn007Tests/ScanAudioPlayerTests.swift      (NEW) — Default-off and failure-tolerant audio tests.
native/CheckIn007UITests/CheckIn007UITests.swift       (NEW) — Native smoke workflow and accessibility tests.
```

No existing `src/`, `index.html`, `data/guests.default.js`, or web test files are
planned to change except for the new parity test that reads the existing web roster.

**Lint coupling (why `.prettierignore` is a MOD):** `prettier --check .` (the `npm run lint`
command) has parsers for `.json` and `.md` but not `.swift`/`.plist`/`.pbxproj`. Adding the
`native/` tree therefore only risks lint on `native/CheckIn007/Resources/default-guests.json`
and any Markdown; the README edits stay Prettier-clean and the generated JSON is
Prettier-conformant, and — belt-and-suspenders — `native/` is added to `.prettierignore` so
the native tree cannot break `npm run lint` regardless. The JSON's parity is instead enforced
by `tests/unit/native-guests-export.test.mjs`.

**Simulator-runtime prerequisite (see §11):** this machine has Xcode 26.4 but **no installed
iPadOS runtime** (`xcrun simctl list runtimes` returns an empty `== Runtimes ==` list), so the
`xcodebuild … test` gate cannot run until a runtime is downloaded. §11 documents the one-time
install and confirmation step required before native verification.

## 6. Implementation Phases

### Phase 1: Native Project And Roster Parity

Create the Xcode project, app target, unit-test target, UI-test target, and default
resource structure. Add `scripts/export-native-guests.mjs` so the native JSON resource is
derived from `data/guests.default.js` rather than manually copied.

```js
import { normalizeGuests } from '../src/lib/roster.mjs';

export function extractDefaultGuests(sourceText) {
  /**
   * Parse the `window.CHECKIN007_DEFAULT_GUESTS = [ ... ]` assignment and return the raw
   * guest rows as `{ name, table }` objects (an optional string `id` is preserved when
   * present). The real web roster rows carry only `{ name, table }` and NO `id` — IDs are
   * generated downstream by `normalizeGuests` via `slugify`, so `id` is NOT required input.
   * Throws only when the source is not a single array assignment of object literals whose
   * `name` and `table` are string literals.
   */
  ...
}

export function writeNativeGuests({ sourcePath, outputPath }) {
  /**
   * Read `sourcePath`, `extractDefaultGuests` the raw rows, then run the web app's OWN
   * `normalizeGuests` (imported from `src/lib/roster.mjs`) so the generated `id`, duplicate
   * dropping, and `searchText` are byte-identical to the web client — a single source of
   * truth, no re-implemented slugify to drift. Write the resulting `guests` array as
   * Prettier-conformant JSON (2-space indent, trailing newline) with stable source row
   * order. Return `{ count, outputPath }`.
   */
  ...
}
```

```swift
struct Guest: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var table: String
    var searchText: String
}

enum SearchNormalizer {
    static func fold(_ value: String) -> String { ... }
    static func slugify(_ value: String) -> String { ... }
}

struct GuestCatalog {
    static func normalize(_ rows: [RawGuest]) -> (guests: [Guest], droppedDuplicates: Int) { ... }
    static func loadDefaultGuests(bundle: Bundle = .main) throws -> [Guest] { ... }
    static func filter(_ guests: [Guest], query: String) -> [Guest] { ... }
}
```

Acceptance criteria:

- `native/CheckIn007/Resources/default-guests.json` contains the same 40 default rows as
  `data/guests.default.js` (verified: `grep -c "name:" data/guests.default.js` → 40), each
  as `{ id, name, table, searchText }`.
- Generated IDs, duplicate-name dropping, and `searchText` match the web app exactly,
  because the script calls the web app's own `normalizeGuests` rather than re-implementing
  `slugify` — the source rows are `{ name, table }` with no `id`, and IDs are generated
  (punctuation/whitespace folded, empty→`guest`, collisions suffixed `-2`, `-3`).
- The generated JSON is Prettier-conformant (2-space indent, trailing newline) so
  `prettier --check .` stays green even though `native/` is also added to `.prettierignore`
  (belt-and-suspenders; see Phase 5 and §7 contract 5).
- The Xcode project opens without needing generated files outside the repo.

### Phase 2: Domain Persistence, Import, Export, And Merge

Implement native equivalents of the existing store, CSV, and merge behavior.

```swift
struct CheckInEntry: Codable, Equatable, Identifiable {
    var visitId: String
    var guestId: String
    var name: String
    var table: String
    var timestamp: String
    var id: String { visitId }
}

protocol KeyValueStore {
    func string(forKey key: String) -> String?
    func set(_ value: String, forKey key: String)
    func removeObject(forKey key: String)
}

final class CheckInStore {
    init(defaults: KeyValueStore, fileURL: URL, clock: @escaping () -> Date)
    func loadRoster() -> [Guest]
    func saveRosterOverride(_ guests: [Guest]) throws -> [Guest]
    func resetRoster() -> [Guest]
    func appendCheckIn(guest: Guest, visitId: String) throws -> [CheckInEntry]
    func loadLog() -> [CheckInEntry]
    func clearLog() throws
    func exportLogCsv() -> String
    func exportLogJson() throws -> String
    func loadAudioSettings() -> AudioSettings
    func saveAudioSettings(_ settings: AudioSettings) -> AudioSettings
}

enum CSVCodec {
    static func parseRows(_ input: String) throws -> [[String]]
    static func parseGuests(_ input: String) throws -> ImportResult
    static func export(rows: [[String: String]], columns: [String]) -> String
}

enum LogMerger {
    static func parseLogFile(name: String, contents: String) throws -> ParsedLogFile
    static func merge(existing: [CheckInEntry], imported: [CheckInEntry]) -> MergeSummary
}
```

Acceptance criteria:

- Storage keys intentionally mirror the web keys where meaningful:
  `checkin007.roster.v1`, `checkin007.audio.v1`; the native log file stores the same
  JSON array shape as web `checkin007.log.v1`.
- Append is idempotent by `visitId`.
- CSV import requires `name` and `table`; optional `id` behaves like web import.
- CSV export columns are exactly `visitId,guestId,name,table,timestamp`.
- Merge preview reports current, imported, accepted, duplicate, invalid, and final
  counts before apply.
- File write failures are thrown to the caller and rendered as admin status messages.

### Phase 3: SwiftUI Kiosk Flow

Build the native state machine and screens.

```swift
@MainActor
@Observable
final class AppModel {
    enum Screen { case loading, roster, scan(Guest), result(Guest, repeatVisit: Bool) }

    var screen: Screen
    var guests: [Guest]
    var query: String
    var adminStatus: String
    var audioSettings: AudioSettings

    init(store: CheckInStore, camera: CameraPreviewModel, audio: ScanAudioPlaying)
    func start()
    func selectGuest(_ guest: Guest)
    func finishScan()
    func dismissResult()
    func openAdmin()
    func importRoster(contents: String)
    func resetRoster()
    func previewMerge(files: [ImportedFile])
    func applyMerge()
    func clearLog(confirming: Bool)
    func setScanBlipEnabled(_ enabled: Bool)
}
```

Native timing constants (mirror `src/config.mjs` `TIMING` / `REDUCED` exactly, in a
`Theme.swift` `Timing` enum, so the sequence is deterministic and testable):

```swift
enum Timing {
    // Mirrors src/config.mjs TIMING (standard) and REDUCED (Reduce Motion).
    static let loadingMs   = 2600, loadingReducedMs   = 900
    static let scanMs      = 4500, scanReducedMs      = 2500
    static let resultMs    = 5000, resultReducedMs    = 4000
    static let transitionMs = 500, transitionReducedMs = 150
}
```

Screen requirements (each timer uses the standard value, or the `…ReducedMs` value when
`UIAccessibility.isReduceMotionEnabled`):

- `LoadingView` shows the same event-operations identity and advances after
  `Timing.loadingMs` (2600 ms; 900 ms under Reduce Motion).
- `RosterView` uses a searchable `List`/`LazyVStack` that remains responsive for at least
  2,000 guests, preserves 44 pt minimum hit targets, and exposes each row as
  "`name`, `table or table pending`" to VoiceOver.
- Admin entry uses a long press on the 007 mark with the same two-second intent as the
  web app.
- `ScanView` starts camera preview on entry, stops the session on exit, falls back to
  covert mode on denial/unavailability, and advances after `Timing.scanMs` (4500 ms;
  2500 ms under Reduce Motion).
- `ResultView` writes the check-in exactly once per generated visit ID and returns to
  roster after `Timing.resultMs` (5000 ms; 4000 ms under Reduce Motion).
- `AdminSheet` supports roster CSV import, reset roster, CSV/JSON export through the iPad
  share sheet, copy actions where pasteboard APIs are available, merge preview/apply,
  clear-log double confirmation, and scan blip toggle.

Acceptance criteria:

- The primary event workflow is usable with touch and VoiceOver.
- Search, import, export, merge, clear, and audio settings are reachable without exposing
  implementation instructions in the UI.
- Reduced Motion shortens transitions and avoids sweeping/animated effects while keeping
  state timing deterministic.

### Phase 4: Camera And Audio Privacy

Implement camera preview and optional audio as isolated services.

```swift
@MainActor
final class CameraPreviewModel: ObservableObject {
    enum State: Equatable { case idle, requestingPermission, running, denied, unavailable, failed(String) }

    var state: State { get }
    var session: AVCaptureSession { get }
    func start() async
    func stop()
}

struct CameraPreviewView: UIViewRepresentable {
    @ObservedObject var model: CameraPreviewModel
    func makeUIView(context: Context) -> PreviewView
    func updateUIView(_ uiView: PreviewView, context: Context)
}

protocol ScanAudioPlaying {
    func setEnabled(_ enabled: Bool)
    func unlockFromGesture()
    func playScanBlip()
    func stop()
}
```

Acceptance criteria:

- `Info.plist` contains `NSCameraUsageDescription` that states the camera is used for a
  live theatrical preview.
- The capture session contains video input and preview only; it has no audio input and no
  photo/movie/video-data outputs.
- `stop()` stops all capture inputs/session work when leaving scan.
- Audio is default-off, does not request microphone permission, and failures are
  non-fatal.
- The scan cue approximates the web sweep: short duration, low gain, rising pitch, and no
  looping/background playback.

### Phase 5: Native Verification And Documentation

Add unit/UI tests and README instructions.

Required commands:

```bash
# Web parity checks (run on any Node; this machine is Node v26.3.0).
npm run lint          # prettier --check . — stays green (README clean, native/ ignored)
npm run test:unit     # includes tests/unit/native-guests-export.test.mjs
npm run build

# One-time: install an iPadOS runtime if none is present (see §11). Confirm, then test.
xcrun simctl list runtimes                       # must show an iOS/iPadOS 26 runtime
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' test
```

If the named simulator is unavailable but a runtime is installed, use `xcrun simctl list
devices available` and select the newest available iPad simulator on the installed iPadOS
26 runtime; document the exact fallback in the implementation notes. If **no** runtime is
installed, `xcrun simctl list runtimes` is empty and the fallback cannot help — install a
runtime first per §11 before either `xcodebuild … test` command.

Acceptance criteria:

- Native unit tests cover normalization, slugging, CSV parse/export, log append
  idempotency, merge dedupe/invalid rows, persistence fallback/error surfaces, camera
  privacy configuration, and audio default-off behavior.
- Native UI tests complete first check-in, repeated guest check-in, admin open/close,
  roster search, and clear-log confirmation using accessibility identifiers.
- Existing web lint/unit/build commands remain green after the native tree is added:
  `prettier --check .` passes (README edits Prettier-formatted; generated JSON is
  Prettier-conformant; `native/` is in `.prettierignore`), `npm run test:unit` passes
  including the new parity test, and `npm run build` produces the same self-contained
  `dist/index.html` within its existing budget.
- README explains native prerequisites (including the one-time iPadOS-runtime install),
  Xcode open/run path, the `xcrun simctl list runtimes` confirmation, the `xcodebuild`
  test command, and the privacy boundary. README stays Prettier-clean.

## 7. Integration Points

1. **Default roster generation**
   - Contract: `scripts/export-native-guests.mjs` reads `data/guests.default.js` and
     writes `native/CheckIn007/Resources/default-guests.json`.
   - Failure mode: malformed source or unsupported literals aborts generation with a
     non-zero exit and leaves the prior JSON untouched.
   - Migration path: web app keeps reading `window.CHECKIN007_DEFAULT_GUESTS`; native app
     reads the generated JSON bundled at build time.

2. **Native local persistence**
   - Contract: roster/audio preferences use `UserDefaults`; log entries use the same
     JSON row fields as web exports.
   - Failure mode: decode failure resets only the corrupted preference; log decode/write
     failure is surfaced in admin status and does not silently discard imported files.
   - Migration path: no automatic migration from browser `localStorage`; operators can
     export from web and merge/import into native through Admin.

3. **Camera permission**
   - Contract: the app requests `.video` authorization only when scan starts.
   - Failure mode: denied/restricted/unavailable camera renders covert mode and continues
     the check-in flow.
   - Migration path: web HTTPS camera behavior remains unchanged.

4. **Export and merge**
   - Contract: exported CSV/JSON must be accepted by the existing web merge tooling and
     native merge tooling.
   - Failure mode: invalid rows are reported and skipped; duplicate visit IDs are counted
     and not appended.
   - Migration path: event teams can mix web and native devices if they consolidate using
     exported files.

5. **Build/test tooling**
   - Contract: web commands stay npm-based; native commands stay Xcode/xcodebuild-based.
     `native/` is added to `.prettierignore`, and the generated JSON is Prettier-conformant,
     so `prettier --check .` (the `npm run lint` command) stays green after the native tree
     lands; native JSON parity is enforced by the unit parity test, not by lint.
   - Failure mode: missing Xcode fails native verification only and does not block web
     artifact generation. Missing iPadOS **runtime** (the current state — `xcrun simctl list
     runtimes` is empty) blocks only the `xcodebuild … test` gate; §11 documents the one-time
     `xcodebuild -downloadPlatform iOS` install to unblock it.
   - Migration path: README documents both tracks separately.

## 8. Error Handling And Edge Cases

- Empty default roster: show an empty roster state; admin import can recover by loading a
  CSV.
- Empty search query: return all guests in stable order.
- Duplicate imported names: drop later duplicates, count them, and keep the first folded
  name match.
- Duplicate generated IDs: suffix `-2`, `-3`, etc. exactly like web normalization.
- CSV with BOM, CRLF, quoted commas, doubled quotes, or blank lines: parse successfully.
- CSV with unterminated quotes or missing required columns: reject import and preserve
  current roster.
- Log file missing on first run: treat as an empty log and create it on first write.
- Corrupted log JSON: surface an admin error and preserve the file for manual export
  rather than overwriting it automatically.
- Disk full or permission denied on log write: keep current in-memory entries, report the
  failure, and allow retry/export of the prior persisted log.
- Rapid repeated guest taps: ignore while transitioning so one selection creates one
  visit ID.
- App backgrounding during scan: stop the camera session; resume only when the scan view
  is active again.
- Camera permission denied: never retry in a loop; show covert mode.
- Camera session interruption: stop session and mark covert/unavailable until the next
  scan attempt.
- Audio session unavailable, muted, interrupted, or disabled: skip cue without blocking
  result display.
- VoiceOver enabled: all actionable controls have labels; scan/result status changes are
  announced through accessible text.
- Reduced Motion enabled: skip decorative sweep/large transitions and use shorter
  timers.
- Large rosters: list rendering remains lazy and search is debounced.

## 9. Stability And Performance

- Guest normalization is `O(n)` over imported rows with `Set`/`Dictionary` lookups for
  folded names and generated IDs. Expected event size is 40-2,000 guests; memory is one
  `Guest` array plus search strings.
- Search is `O(n * q)` per query where `q` is folded query length; for 2,000 guests this
  is well under a frame when debounced to 120 ms on modern iPads.
- Log append is `O(n)` to check visit-ID idempotency. At 5,000 check-ins, the JSON log is
  still small enough for atomic file rewrites; if future event size exceeds this, SQLite
  becomes a separate backlog item.
- Merge is `O(e + i)` for existing plus imported rows using a `Set` of visit IDs.
- Camera startup occurs off the main actor where AVFoundation configuration permits;
  UI state updates return to the main actor.
- Camera session lifetime is bounded to the scan screen and stopped on cleanup,
  backgrounding, or deinit.
- Audio cue allocation is per short cue or prewarmed engine with explicit stop; no
  unbounded timers or background loops are allowed.
- Native tests should complete in under two minutes on a warmed simulator; unit tests
  should complete in under ten seconds.

## 10. Testing Strategy

Unit tests:

- `GuestCatalogTests`: folding, slugging, duplicate-name dropping, ID collision suffixes,
  default roster load count, empty/malformed resource errors.
- `CSVCodecTests`: BOM, CRLF, quoted commas, doubled quotes, blank rows, missing columns,
  unterminated quote rejection, export escaping.
- `CheckInStoreTests`: first-run empty log, append idempotency, JSON/CSV export shape,
  roster override/reset, audio default false, write failure surfacing.
- `LogMergerTests`: JSON and CSV import, duplicate visit IDs, invalid rows, final sort,
  file-error summaries.
- `CameraPrivacyTests`: session builder never adds audio input or capture outputs and
  denial maps to covert state.
- `ScanAudioPlayerTests`: default-off no-op, enabled cue path, interruption/failure
  no-throw behavior.

UI tests:

- Launch to roster, search a known guest, select, scan, result, return to roster.
- Repeat the same guest and verify repeat state without duplicate visit ID for one scan.
- Open admin by long press, toggle audio, close, and verify focus/roster recovery.
- Import invalid CSV and verify the existing roster remains visible.
- Clear log requires two confirmations.
- Accessibility identifiers exist for roster search, rows, scan status, result title,
  admin sheet, export buttons, merge controls, and clear-log control.

Regression tests:

- Existing web `npm run lint`, `npm run test:unit`, and `npm run build` remain green.
- The native exported JSON is regenerated deterministically from the existing web roster
  and compared in `tests/unit/native-guests-export.test.mjs`. **Comparison method:** the
  test calls `writeNativeGuests` targeting a temp path (or an in-memory string), then
  **byte-compares** the produced string against the committed
  `native/CheckIn007/Resources/default-guests.json`; it fails if they differ, catching a
  stale committed file. Determinism is guaranteed because (a) input row order is the source
  order in `data/guests.default.js`, (b) IDs/dedupe come from the single shared
  `normalizeGuests`, and (c) serialization is fixed Prettier-conformant JSON (2-space
  indent, trailing newline). The test also asserts `count === 40`. If Prettier's JSON
  formatting or the export order ever changes, this test fails until the committed file is
  regenerated, keeping the two in lockstep.

## 11. Environment And Toolchain

Required:

- macOS capable of running Xcode 26.
- Xcode 26 stable with the iPadOS 26 SDK. **Minimum deployment target: iPadOS 26.0.**
- **At least one installed iPadOS simulator runtime** (see the note below — this is NOT
  installed by default with Xcode).
- Command Line Tools selected with `sudo xcode-select -s /Applications/Xcode.app`.
- Existing Node/npm environment for web parity checks and roster export script.

**Verifying without a preinstalled simulator runtime (current machine state).** This machine
has Xcode 26.4 (`xcodebuild -version` → `Xcode 26.4`) but **no installed iPadOS runtime**:
`xcrun simctl list runtimes` returns an empty `== Runtimes ==` list and `xcrun simctl list
devices available` lists no iOS/iPadOS devices. A simulator runtime is a multi-GB download
separate from Xcode itself, so the `xcodebuild … test` gate cannot run until one is
installed. Install it once, then confirm before testing:

```bash
xcodebuild -downloadPlatform iOS        # or: Xcode → Settings → Components → iOS/iPadOS 26
xcrun simctl list runtimes              # confirm an iOS/iPadOS 26 runtime now appears
xcrun simctl list devices available | grep -i 'iPad Pro 13-inch (M4)'   # confirm the device
```

If the `iPad Pro 13-inch (M4)` device is not present on the installed runtime, pick the
newest available iPad from `xcrun simctl list devices available` and pass its name to the
`-destination` flag (record the exact substitution in the implementation notes).

Fresh clone setup:

```bash
npm ci
node scripts/export-native-guests.mjs
open native/CheckIn007.xcodeproj
# Ensure a runtime is installed (see above) before the test command:
xcodebuild -project native/CheckIn007.xcodeproj -scheme CheckIn007 -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' test
```

The native app must not require network access at runtime. Camera permission is the only
system permission needed for the event workflow.

## 12. Deployment And Distribution

- Development run: open the Xcode project, select the `CheckIn007` scheme, select an iPad
  simulator or connected iPad, and Run.
- Local device distribution: use Xcode signing for a connected iPad. Signing team and
  provisioning decisions are operator-owned and documented as out of scope for this
  cycle.
- Artifact: the source-controlled Xcode project and Swift files are the deliverable; no
  `.ipa` is committed.
- Rollback: revert the native directory, README native section, roster export script,
  parity test, and the backlog marker. The web app is isolated and remains deployable
  throughout.

## 13. Open Questions

1. **Exact iPad simulator name availability.**
   Proposed resolution: install an iPadOS 26 runtime first (§11 — this machine has none by
   default), default to `iPad Pro 13-inch (M4)` for Xcode 26, and fall back to the newest
   device from `xcrun simctl list devices available` on the installed runtime, recording the
   exact substitution during implementation.

2. **Native typography asset reuse.**
   Proposed resolution: start with system fonts styled to match the existing hierarchy;
   only bundle the existing web font subsets if visual review shows the native app loses
   the intended event identity.

3. **Distribution signing team.**
   Proposed resolution: leave signing automatic/manual settings at development defaults
   and document that operators must choose their own team before installing on physical
   iPads.

4. **Whether native and web logs should share storage automatically.**
   Proposed resolution: no automatic sharing in this cycle. Cross-client consolidation is
   through explicit CSV/JSON export and merge to preserve the offline, auditable workflow.
