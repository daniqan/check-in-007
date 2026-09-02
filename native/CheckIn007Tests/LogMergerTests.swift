import XCTest

@testable import CheckIn007

final class LogMergerTests: XCTestCase {
    private func entry(_ visitId: String, _ guestId: String, _ ts: String) -> CheckInEntry {
        CheckInEntry(visitId: visitId, guestId: guestId, name: guestId, table: "T", timestamp: ts)
    }

    func testMergeDedupesByVisitIdAndCountsDuplicates() {
        let existing = [entry("v1", "a", "2026-09-02T10:00:00+00:00")]
        let imported = [
            entry("v1", "a", "2026-09-02T10:00:00+00:00"),
            entry("v2", "b", "2026-09-02T11:00:00+00:00"),
        ]
        let summary = LogMerger.merge(existing: existing, imported: imported)
        XCTAssertEqual(summary.acceptedCount, 1)
        XCTAssertEqual(summary.duplicateCount, 1)
        XCTAssertEqual(summary.finalCount, 2)
        XCTAssertEqual(summary.entries.map(\.visitId), ["v1", "v2"])
    }

    func testMergeCountsInvalidImportedRows() {
        let imported = [
            entry("v2", "", "2026-09-02T11:00:00+00:00"),  // missing guestId
            entry("v3", "c", "not-a-date"),  // invalid timestamp
        ]
        let summary = LogMerger.merge(existing: [], imported: imported)
        XCTAssertEqual(summary.invalidImportedCount, 2)
        XCTAssertEqual(summary.acceptedCount, 0)
    }

    func testMergeSortsByTimestamp() {
        let imported = [
            entry("v2", "b", "2026-09-02T12:00:00+00:00"),
            entry("v1", "a", "2026-09-02T09:00:00+00:00"),
        ]
        let summary = LogMerger.merge(existing: [], imported: imported)
        XCTAssertEqual(summary.entries.map(\.visitId), ["v1", "v2"])
    }

    func testParseLogJsonAndCsv() {
        let json = "[{\"visitId\":\"v1\",\"guestId\":\"a\",\"name\":\"Ava\",\"table\":\"T\",\"timestamp\":\"2026-09-02T10:00:00+00:00\"}]"
        XCTAssertEqual(LogMerger.parseLogFile(name: "log.json", contents: json).entries.count, 1)

        let csv = "visitId,guestId,name,table,timestamp\nv1,a,Ava,T,2026-09-02T10:00:00+00:00\n"
        XCTAssertEqual(LogMerger.parseLogFile(name: "log.csv", contents: csv).entries.count, 1)
    }

    func testParseLogCsvMissingColumnsReportsError() {
        let parsed = LogMerger.parseLogFile(name: "log.csv", contents: "visitId,name\nv1,Ava\n")
        XCTAssertTrue(parsed.entries.isEmpty)
        XCTAssertEqual(parsed.errors.count, 1)
    }
}
