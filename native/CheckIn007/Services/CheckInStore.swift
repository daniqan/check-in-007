import Foundation

/// Small key/value abstraction so persistence is injectable for tests. `UserDefaults` conforms in
/// production; an in-memory implementation is used by unit tests.
protocol KeyValueStore: AnyObject {
    func string(forKey key: String) -> String?
    func set(_ value: String, forKey key: String)
    func removeObject(forKey key: String)
}

extension UserDefaults: KeyValueStore {
    func set(_ value: String, forKey key: String) {
        setValue(value, forKey: key)
    }
}

/// Local persistence and export. Mirrors the web `createStore` (`src/lib/store.mjs`): roster
/// override and audio settings live in a `KeyValueStore` (`UserDefaults`); the event log is a JSON
/// array file written atomically. Storage keys intentionally match the web `checkin007.*` keys.
final class CheckInStore {
    enum StorageKey {
        static let log = "checkin007.log.v1"
        static let roster = "checkin007.roster.v1"
        static let audio = "checkin007.audio.v1"
    }

    private let defaults: KeyValueStore
    private let fileURL: URL
    private let clock: () -> Date
    private let bundle: Bundle
    private let injectedDefaultRoster: [Guest]?

    /// - Parameters:
    ///   - defaults: key/value store for roster override + audio settings.
    ///   - fileURL: JSON file backing the event log (created on first write).
    ///   - clock: time source for check-in timestamps (injectable for deterministic tests).
    ///   - bundle: bundle to load the default roster resource from.
    ///   - defaultRoster: optional explicit default roster; when `nil` it is loaded from `bundle`.
    init(
        defaults: KeyValueStore,
        fileURL: URL,
        clock: @escaping () -> Date = { Date() },
        bundle: Bundle = .main,
        defaultRoster: [Guest]? = nil
    ) {
        self.defaults = defaults
        self.fileURL = fileURL
        self.clock = clock
        self.bundle = bundle
        self.injectedDefaultRoster = defaultRoster
    }

    // MARK: Roster

    private func defaultRoster() -> [Guest] {
        if let injectedDefaultRoster { return injectedDefaultRoster }
        return (try? GuestCatalog.loadDefaultGuests(bundle: bundle)) ?? []
    }

    func loadRoster() -> [Guest] {
        guard let override = defaults.string(forKey: StorageKey.roster), !override.isEmpty else {
            return defaultRoster()
        }
        guard let data = override.data(using: .utf8),
            let rawRows = try? JSONDecoder().decode([RawGuest].self, from: data)
        else {
            defaults.removeObject(forKey: StorageKey.roster)
            return defaultRoster()
        }
        return GuestCatalog.normalize(rawRows).guests
    }

    @discardableResult
    func saveRosterOverride(_ guests: [Guest]) throws -> [Guest] {
        let data = try JSONEncoder().encode(guests)
        defaults.set(String(decoding: data, as: UTF8.self), forKey: StorageKey.roster)
        return loadRoster()
    }

    @discardableResult
    func resetRoster() -> [Guest] {
        defaults.removeObject(forKey: StorageKey.roster)
        return loadRoster()
    }

    // MARK: Log

    func loadLog() -> [CheckInEntry] {
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        return (try? JSONDecoder().decode([CheckInEntry].self, from: data)) ?? []
    }

    private func saveLog(_ entries: [CheckInEntry]) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted]
        let data = try encoder.encode(entries)
        try data.write(to: fileURL, options: [.atomic])
    }

    /// Append a check-in. Idempotent by `visitId`: a repeated `visitId` returns the current log
    /// unchanged. Mirrors `appendCheckIn` in the web store.
    @discardableResult
    func appendCheckIn(guest: Guest, visitId: String) throws -> [CheckInEntry] {
        var entries = loadLog()
        if entries.contains(where: { $0.visitId == visitId }) { return entries }
        entries.append(
            CheckInEntry(
                visitId: visitId,
                guestId: guest.id,
                name: guest.name,
                table: guest.table.isEmpty ? "" : guest.table,
                timestamp: Self.localIso(clock())
            )
        )
        try saveLog(entries)
        return entries
    }

    func clearLog() throws {
        try saveLog([])
    }

    // MARK: Merge

    func previewLogMerge(_ imported: [CheckInEntry]) -> MergeSummary {
        LogMerger.merge(existing: loadLog(), imported: imported)
    }

    @discardableResult
    func mergeLog(_ imported: [CheckInEntry]) throws -> MergeSummary {
        let summary = LogMerger.merge(existing: loadLog(), imported: imported)
        try saveLog(summary.entries)
        return summary
    }

    // MARK: Export

    func exportLogCsv() -> String {
        let columns = LogMerger.logColumns
        let rows = loadLog().map { entry in
            [
                "visitId": entry.visitId,
                "guestId": entry.guestId,
                "name": entry.name,
                "table": entry.table,
                "timestamp": entry.timestamp,
            ]
        }
        return CSVCodec.export(rows: rows, columns: columns)
    }

    func exportLogJson() throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted]
        let data = try encoder.encode(loadLog())
        return String(decoding: data, as: UTF8.self)
    }

    // MARK: Audio settings

    func loadAudioSettings() -> AudioSettings {
        AudioSettings.normalized(from: defaults.string(forKey: StorageKey.audio))
    }

    @discardableResult
    func saveAudioSettings(_ settings: AudioSettings) -> AudioSettings {
        let normalized = AudioSettings(scanBlipEnabled: settings.scanBlipEnabled)
        defaults.set(normalized.jsonString(), forKey: StorageKey.audio)
        return normalized
    }

    // MARK: Helpers

    /// Local ISO-8601 timestamp with numeric offset, e.g. `2026-09-02T18:04:11+02:00`. Mirrors the
    /// web `formatLocalIso` output shape closely enough for CSV/JSON export and cross-client merge.
    static func localIso(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZZZZZ"
        return formatter.string(from: date)
    }
}
