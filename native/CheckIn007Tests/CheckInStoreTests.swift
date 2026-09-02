import XCTest

@testable import CheckIn007

/// In-memory key/value store for deterministic persistence tests.
final class MemoryKeyValueStore: KeyValueStore {
    private var storage: [String: String] = [:]
    func string(forKey key: String) -> String? { storage[key] }
    func set(_ value: String, forKey key: String) { storage[key] = value }
    func removeObject(forKey key: String) { storage[key] = nil }
}

final class CheckInStoreTests: XCTestCase {
    private var fileURL: URL!
    private var defaults: MemoryKeyValueStore!

    private let sampleGuest = Guest(
        id: "ava-sterling", name: "Ava Sterling", table: "Table 1", searchText: "ava sterling table 1"
    )
    private let fixedClock: () -> Date = { Date(timeIntervalSince1970: 1_700_000_000) }

    override func setUpWithError() throws {
        defaults = MemoryKeyValueStore()
        fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("checkin-\(UUID().uuidString).json")
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: fileURL)
    }

    private func makeStore() -> CheckInStore {
        CheckInStore(
            defaults: defaults,
            fileURL: fileURL,
            clock: fixedClock,
            defaultRoster: [sampleGuest]
        )
    }

    func testFirstRunLogIsEmpty() {
        XCTAssertEqual(makeStore().loadLog(), [])
    }

    func testAppendIsIdempotentByVisitId() throws {
        let store = makeStore()
        let first = try store.appendCheckIn(guest: sampleGuest, visitId: "v1")
        let second = try store.appendCheckIn(guest: sampleGuest, visitId: "v1")
        XCTAssertEqual(first.count, 1)
        XCTAssertEqual(second.count, 1)
        let third = try store.appendCheckIn(guest: sampleGuest, visitId: "v2")
        XCTAssertEqual(third.count, 2)
    }

    func testExportCsvColumnsMatchWebOrder() throws {
        let store = makeStore()
        _ = try store.appendCheckIn(guest: sampleGuest, visitId: "v1")
        let csv = store.exportLogCsv()
        XCTAssertTrue(csv.hasPrefix("visitId,guestId,name,table,timestamp\n"))
        XCTAssertTrue(csv.contains("v1,ava-sterling,Ava Sterling,Table 1,"))
    }

    func testExportJsonRoundTrips() throws {
        let store = makeStore()
        _ = try store.appendCheckIn(guest: sampleGuest, visitId: "v1")
        let json = try store.exportLogJson()
        let decoded = try JSONDecoder().decode([CheckInEntry].self, from: Data(json.utf8))
        XCTAssertEqual(decoded.first?.visitId, "v1")
    }

    func testRosterOverrideAndReset() throws {
        let store = makeStore()
        let override = [
            Guest(id: "x", name: "New Agent", table: "Nine", searchText: "new agent nine")
        ]
        let saved = try store.saveRosterOverride(override)
        XCTAssertEqual(saved.map(\.name), ["New Agent"])
        XCTAssertEqual(store.resetRoster().map(\.name), ["Ava Sterling"])
    }

    func testAudioSettingsDefaultFalseAndPersist() {
        let store = makeStore()
        XCTAssertFalse(store.loadAudioSettings().scanBlipEnabled)
        _ = store.saveAudioSettings(AudioSettings(scanBlipEnabled: true))
        XCTAssertTrue(store.loadAudioSettings().scanBlipEnabled)
    }

    func testWriteFailureSurfacesAsThrow() {
        // A file URL inside a non-existent directory cannot be written atomically.
        let badURL = URL(fileURLWithPath: "/nonexistent-dir-\(UUID().uuidString)/log.json")
        let store = CheckInStore(defaults: defaults, fileURL: badURL, defaultRoster: [sampleGuest])
        XCTAssertThrowsError(try store.appendCheckIn(guest: sampleGuest, visitId: "v1"))
    }

    func testClearLogEmptiesTheLog() throws {
        let store = makeStore()
        _ = try store.appendCheckIn(guest: sampleGuest, visitId: "v1")
        try store.clearLog()
        XCTAssertEqual(store.loadLog(), [])
    }
}
