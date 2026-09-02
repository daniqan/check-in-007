import Foundation

/// One invalid row encountered while parsing an imported log file. Mirrors the web
/// `rowError` shape (`src/lib/log-merge.mjs`).
struct LogRowError: Equatable {
    var sourceName: String
    var rowNumber: Int
    var message: String
}

/// The result of parsing a single imported log file (JSON or CSV) into candidate entries plus
/// any invalid rows and file-level errors. Mirrors the web `parseLogFile` return shape.
struct ParsedLogFile: Equatable {
    var entries: [CheckInEntry]
    var invalidRows: [LogRowError]
    var errors: [String]

    static let empty = ParsedLogFile(entries: [], invalidRows: [], errors: [])
}

/// The preview/result of merging imported entries into the existing log. Mirrors the web
/// `mergeLogEntries` summary (`src/lib/log-merge.mjs`) and additionally carries the resolved,
/// de-duplicated, sorted `entries` so an apply step can persist them without recomputing.
struct MergeSummary: Equatable {
    var currentCount: Int
    var importedCount: Int
    var acceptedCount: Int
    var duplicateCount: Int
    var invalidImportedCount: Int
    var invalidExistingCount: Int
    var entries: [CheckInEntry]

    /// Total entries after merge — the "final count" shown in the admin preview.
    var finalCount: Int { entries.count }
}
