import Foundation
import Observation

/// A file imported for log merge (name + contents), produced by the admin document picker.
struct ImportedFile: Equatable {
    var name: String
    var contents: String
}

/// The kiosk state machine and orchestration layer. Owns roster/log/audio state, drives the
/// loading → roster → scan → result progression, and exposes admin operations. `@Observable` on the
/// main actor so SwiftUI views observe it directly.
@MainActor
@Observable
final class AppModel {
    enum Screen: Equatable {
        case loading
        case roster
        case scan(Guest)
        case result(Guest, repeatVisit: Bool)
    }

    private(set) var screen: Screen = .loading
    private(set) var guests: [Guest] = []
    var query: String = ""
    private(set) var adminStatus: String = ""
    private(set) var audioSettings: AudioSettings = .disabled
    private(set) var pendingMerge: MergeSummary?

    private let store: CheckInStore
    let camera: CameraPreviewModel
    private let audio: ScanAudioPlaying

    private var currentVisitId: String?
    private var isTransitioning = false
    private let makeVisitId: () -> String

    init(
        store: CheckInStore,
        camera: CameraPreviewModel,
        audio: ScanAudioPlaying,
        makeVisitId: @escaping () -> String = { UUID().uuidString }
    ) {
        self.store = store
        self.camera = camera
        self.audio = audio
        self.makeVisitId = makeVisitId
    }

    /// Guests filtered by the current folded query.
    var filteredGuests: [Guest] {
        GuestCatalog.filter(guests, query: query)
    }

    /// Load persisted state and enter the roster after the loading beat (the caller drives the
    /// loading timer; this seeds the data synchronously).
    func start() {
        guests = store.loadRoster()
        audioSettings = store.loadAudioSettings()
        audio.setEnabled(audioSettings.scanBlipEnabled)
    }

    /// Advance from the loading screen to the roster.
    func enterRoster() {
        screen = .roster
    }

    /// Select a guest and begin a scan with a fresh visit ID. Ignores rapid repeat taps while a
    /// transition is in flight so one selection creates exactly one visit ID.
    func selectGuest(_ guest: Guest) {
        guard !isTransitioning, case .roster = screen else { return }
        isTransitioning = true
        currentVisitId = makeVisitId()
        screen = .scan(guest)
        isTransitioning = false
    }

    /// A genuine user gesture occurred — allow the optional cue to sound later.
    func unlockAudioFromGesture() {
        audio.unlockFromGesture()
    }

    /// Finish the scan: write the check-in exactly once for this visit ID, play the optional cue,
    /// and move to the result screen. Records whether this guest was already in the log.
    func finishScan() {
        guard case let .scan(guest) = screen, let visitId = currentVisitId else { return }
        let existing = store.loadLog()
        let repeatVisit = existing.contains { $0.guestId == guest.id }
        do {
            _ = try store.appendCheckIn(guest: guest, visitId: visitId)
            audio.playScanBlip()
        } catch {
            adminStatus = "Could not save check-in: \(error.localizedDescription)"
        }
        screen = .result(guest, repeatVisit: repeatVisit)
    }

    /// Return from the result screen to the roster and clear the query.
    func dismissResult() {
        currentVisitId = nil
        query = ""
        screen = .roster
        camera.stop()
    }

    // MARK: Admin

    func importRoster(contents: String) {
        do {
            let result = try CSVCodec.parseGuests(contents)
            guests = try store.saveRosterOverride(result.guests)
            adminStatus =
                "Imported \(result.guests.count) guests (\(result.droppedDuplicates) duplicates dropped)."
        } catch {
            adminStatus = "Roster import failed; existing roster kept."
        }
    }

    func resetRoster() {
        guests = store.resetRoster()
        adminStatus = "Roster reset to defaults."
    }

    func previewMerge(files: [ImportedFile]) {
        var imported: [CheckInEntry] = []
        var errors: [String] = []
        for file in files {
            let parsed = LogMerger.parseLogFile(name: file.name, contents: file.contents)
            imported.append(contentsOf: parsed.entries)
            errors.append(contentsOf: parsed.errors)
        }
        let summary = store.previewLogMerge(imported)
        pendingMerge = summary
        adminStatus =
            "Merge preview: \(summary.acceptedCount) new, \(summary.duplicateCount) duplicates, "
            + "\(summary.invalidImportedCount) invalid, \(summary.finalCount) total."
        if !errors.isEmpty { adminStatus += " (\(errors.count) file error(s))" }
    }

    func applyMerge() {
        guard let pending = pendingMerge else { return }
        do {
            let summary = try store.mergeLog(pending.entries)
            pendingMerge = nil
            adminStatus = "Merge applied: \(summary.finalCount) entries."
        } catch {
            adminStatus = "Merge failed to save; log unchanged."
        }
    }

    /// Clear the log only when explicitly confirmed (double-confirm handled by the UI).
    func clearLog(confirming: Bool) {
        guard confirming else { return }
        do {
            try store.clearLog()
            adminStatus = "Check-in log cleared."
        } catch {
            adminStatus = "Could not clear log."
        }
    }

    func setScanBlipEnabled(_ enabled: Bool) {
        audioSettings = store.saveAudioSettings(AudioSettings(scanBlipEnabled: enabled))
        audio.setEnabled(audioSettings.scanBlipEnabled)
    }

    func exportLogCsv() -> String { store.exportLogCsv() }
    func exportLogJson() -> String { (try? store.exportLogJson()) ?? "[]" }
    func logCount() -> Int { store.loadLog().count }
}
