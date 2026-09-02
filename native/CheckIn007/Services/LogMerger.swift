import Foundation

/// Parses imported log files (JSON or CSV) and merges entries into the existing log with
/// visit-ID de-duplication and a stable sort. A faithful port of `src/lib/log-merge.mjs`.
enum LogMerger {
    static let logColumns = ["visitId", "guestId", "name", "table", "timestamp"]

    private struct Decorated {
        var entry: CheckInEntry
        var sortTime: Double
    }

    private static func clean(_ value: String?) -> String {
        (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Parse an ISO-8601 timestamp to seconds-since-epoch, or `nil` when unparseable — the native
    /// analogue of `Date.parse(...)` returning `NaN`.
    static func sortTime(for timestamp: String) -> Double? {
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let date = plain.date(from: timestamp) { return date.timeIntervalSince1970 }

        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: timestamp) { return date.timeIntervalSince1970 }

        return nil
    }

    /// Mirrors `normalizeLogEntry`: require `guestId`, `name`, and a parseable `timestamp`.
    /// Returns the normalized entry and its sort time, or a row error.
    static func normalizeEntry(
        visitId: String?,
        guestId: String?,
        name: String?,
        table: String?,
        timestamp: String?,
        sourceName: String,
        rowNumber: Int
    ) -> (entry: CheckInEntry, sortTime: Double)? {
        let entry = CheckInEntry(
            visitId: clean(visitId),
            guestId: clean(guestId),
            name: clean(name),
            table: clean(table),
            timestamp: clean(timestamp)
        )
        guard !entry.guestId.isEmpty, !entry.name.isEmpty, !entry.timestamp.isEmpty else {
            return nil
        }
        guard let time = sortTime(for: entry.timestamp) else { return nil }
        return (entry, time)
    }

    private static func rowError(_ sourceName: String, _ rowNumber: Int, _ message: String) -> LogRowError {
        LogRowError(sourceName: sourceName, rowNumber: rowNumber, message: message)
    }

    private static func validationMessage(
        visitId: String?,
        guestId: String?,
        name: String?,
        timestamp: String?
    ) -> String {
        if clean(guestId).isEmpty { return "Missing guestId." }
        if clean(name).isEmpty { return "Missing name." }
        if clean(timestamp).isEmpty { return "Missing timestamp." }
        return "Invalid timestamp."
    }

    static func parseLogJson(_ text: String, sourceName: String = "log.json") -> ParsedLogFile {
        guard let data = text.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: data)
        else {
            return ParsedLogFile(entries: [], invalidRows: [], errors: ["\(sourceName): Invalid JSON."])
        }
        guard let array = json as? [Any] else {
            return ParsedLogFile(
                entries: [],
                invalidRows: [],
                errors: ["\(sourceName): JSON log export must be an array."]
            )
        }

        var entries: [CheckInEntry] = []
        var invalidRows: [LogRowError] = []
        for (index, element) in array.enumerated() {
            let row = element as? [String: Any] ?? [:]
            let normalized = normalizeEntry(
                visitId: row["visitId"] as? String,
                guestId: row["guestId"] as? String,
                name: row["name"] as? String,
                table: row["table"] as? String,
                timestamp: row["timestamp"] as? String,
                sourceName: sourceName,
                rowNumber: index + 1
            )
            if let normalized {
                entries.append(normalized.entry)
            } else {
                invalidRows.append(
                    rowError(
                        sourceName,
                        index + 1,
                        validationMessage(
                            visitId: row["visitId"] as? String,
                            guestId: row["guestId"] as? String,
                            name: row["name"] as? String,
                            timestamp: row["timestamp"] as? String
                        )
                    )
                )
            }
        }
        return ParsedLogFile(entries: entries, invalidRows: invalidRows, errors: [])
    }

    static func parseLogCsv(_ text: String, sourceName: String = "log.csv") -> ParsedLogFile {
        let rows: [[String]]
        do {
            rows = try CSVCodec.parseRows(text)
        } catch {
            return ParsedLogFile(entries: [], invalidRows: [], errors: ["\(sourceName): \(error)"])
        }

        guard let header = rows.first, !header.isEmpty else {
            return ParsedLogFile(entries: [], invalidRows: [], errors: ["\(sourceName): CSV is empty."])
        }
        let headers = header.map { clean($0) }
        let missing = logColumns.filter { !headers.contains($0) }
        if !missing.isEmpty {
            return ParsedLogFile(
                entries: [],
                invalidRows: [],
                errors: ["\(sourceName): CSV is missing required columns: \(missing.joined(separator: ", "))."]
            )
        }

        let indexes = Dictionary(uniqueKeysWithValues: logColumns.map { ($0, headers.firstIndex(of: $0)!) })
        func cell(_ cells: [String], _ column: String) -> String {
            let position = indexes[column]!
            return cells.indices.contains(position) ? cells[position] : ""
        }

        var entries: [CheckInEntry] = []
        var invalidRows: [LogRowError] = []
        for (offset, cells) in rows.dropFirst().enumerated() {
            let rowNumber = offset + 2
            let normalized = normalizeEntry(
                visitId: cell(cells, "visitId"),
                guestId: cell(cells, "guestId"),
                name: cell(cells, "name"),
                table: cell(cells, "table"),
                timestamp: cell(cells, "timestamp"),
                sourceName: sourceName,
                rowNumber: rowNumber
            )
            if let normalized {
                entries.append(normalized.entry)
            } else {
                invalidRows.append(
                    rowError(
                        sourceName,
                        rowNumber,
                        validationMessage(
                            visitId: cell(cells, "visitId"),
                            guestId: cell(cells, "guestId"),
                            name: cell(cells, "name"),
                            timestamp: cell(cells, "timestamp")
                        )
                    )
                )
            }
        }
        return ParsedLogFile(entries: entries, invalidRows: invalidRows, errors: [])
    }

    /// Mirrors `parseLogFile`: pick JSON vs CSV by extension, falling back to a content sniff.
    static func parseLogFile(name: String, contents: String) -> ParsedLogFile {
        let lower = clean(name).lowercased()
        if lower.hasSuffix(".json") { return parseLogJson(contents, sourceName: name) }
        if lower.hasSuffix(".csv") { return parseLogCsv(contents, sourceName: name) }
        let trimmed = clean(contents)
        if trimmed.hasPrefix("[") || trimmed.hasPrefix("{") {
            return parseLogJson(contents, sourceName: name)
        }
        return parseLogCsv(contents, sourceName: name)
    }

    private static func dedupeKey(_ entry: CheckInEntry) -> String {
        entry.visitId.isEmpty ? "fallback:\(entry.guestId)|\(entry.timestamp)" : "visit:\(entry.visitId)"
    }

    private static func compare(_ left: Decorated, _ right: Decorated) -> Bool {
        if left.sortTime != right.sortTime { return left.sortTime < right.sortTime }
        let byGuest = left.entry.guestId.compare(right.entry.guestId)
        if byGuest != .orderedSame { return byGuest == .orderedAscending }
        let byName = left.entry.name.lowercased().compare(right.entry.name.lowercased())
        if byName != .orderedSame { return byName == .orderedAscending }
        let byTable = left.entry.table.compare(right.entry.table)
        if byTable != .orderedSame { return byTable == .orderedAscending }
        return left.entry.visitId.compare(right.entry.visitId) == .orderedAscending
    }

    /// Mirrors `mergeLogEntries`: keep the first occurrence of each visit ID (existing then
    /// imported), count duplicates/invalids, and sort by time then stable tie-breakers.
    static func merge(existing: [CheckInEntry], imported: [CheckInEntry]) -> MergeSummary {
        var seen = Set<String>()
        var decorated: [Decorated] = []
        var summary = MergeSummary(
            currentCount: existing.count,
            importedCount: imported.count,
            acceptedCount: 0,
            duplicateCount: 0,
            invalidImportedCount: 0,
            invalidExistingCount: 0,
            entries: []
        )

        for row in existing {
            guard let normalized = normalizeEntry(
                visitId: row.visitId, guestId: row.guestId, name: row.name,
                table: row.table, timestamp: row.timestamp,
                sourceName: "local storage", rowNumber: 0
            ) else {
                summary.invalidExistingCount += 1
                continue
            }
            let key = dedupeKey(normalized.entry)
            if seen.contains(key) { continue }
            seen.insert(key)
            decorated.append(Decorated(entry: normalized.entry, sortTime: normalized.sortTime))
        }

        for row in imported {
            guard let normalized = normalizeEntry(
                visitId: row.visitId, guestId: row.guestId, name: row.name,
                table: row.table, timestamp: row.timestamp,
                sourceName: "import", rowNumber: 0
            ) else {
                summary.invalidImportedCount += 1
                continue
            }
            let key = dedupeKey(normalized.entry)
            if seen.contains(key) {
                summary.duplicateCount += 1
                continue
            }
            seen.insert(key)
            summary.acceptedCount += 1
            decorated.append(Decorated(entry: normalized.entry, sortTime: normalized.sortTime))
        }

        decorated.sort(by: compare)
        summary.entries = decorated.map { $0.entry }
        return summary
    }
}
