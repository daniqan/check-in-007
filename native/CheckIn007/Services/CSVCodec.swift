import Foundation

/// CSV parsing and export matching the web edge cases (`src/lib/csv.mjs`): a hand-rolled state
/// machine that handles BOM, CRLF, quoted commas, doubled quotes, and blank-line dropping, and
/// rejects unterminated quotes.
enum CSVCodec {
    enum CSVError: Error, Equatable {
        case unterminatedQuote
        case empty
        case missingColumn(String)
    }

    /// The result of importing a guest CSV — mirrors `parseGuestCsv`'s return shape.
    struct ImportResult: Equatable {
        var guests: [Guest]
        var droppedDuplicates: Int
        var importedRows: Int
    }

    /// Mirrors `parseCsv`: strip a leading BOM, parse the RFC-4180-ish grid, and drop rows whose
    /// cells are all whitespace. Throws on an unterminated quoted field.
    static func parseRows(_ input: String) throws -> [[String]] {
        var source = Substring(input)
        if source.first == "\u{FEFF}" { source = source.dropFirst() }

        var rows: [[String]] = []
        var row: [String] = []
        var field = ""
        var quoted = false

        let characters = Array(source)
        var index = 0
        while index < characters.count {
            let character = characters[index]
            let next = index + 1 < characters.count ? characters[index + 1] : nil

            if quoted {
                if character == "\"" && next == "\"" {
                    field.append("\"")
                    index += 1
                } else if character == "\"" {
                    quoted = false
                } else {
                    field.append(character)
                }
                index += 1
                continue
            }

            if character == "\"" {
                quoted = true
            } else if character == "," {
                row.append(field)
                field = ""
            } else if character == "\n" {
                row.append(field)
                rows.append(row)
                row = []
                field = ""
            } else if character != "\r" {
                field.append(character)
            }
            index += 1
        }

        if quoted { throw CSVError.unterminatedQuote }
        row.append(field)
        rows.append(row)

        return rows.filter { cells in
            cells.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        }
    }

    /// Mirrors `parseGuestCsv`: require `name` and `table` header columns, treat `id` as optional,
    /// and normalize via `GuestCatalog.normalize` so imported IDs match the web app.
    static func parseGuests(_ input: String) throws -> ImportResult {
        let rows = try parseRows(input)
        guard let header = rows.first else { throw CSVError.empty }

        let headers = header.map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
        guard let nameIndex = headers.firstIndex(of: "name") else {
            throw CSVError.missingColumn("name")
        }
        guard let tableIndex = headers.firstIndex(of: "table") else {
            throw CSVError.missingColumn("table")
        }
        let idIndex = headers.firstIndex(of: "id")

        let rawGuests: [RawGuest] = rows.dropFirst().map { cells in
            RawGuest(
                name: cells.indices.contains(nameIndex) ? cells[nameIndex] : "",
                table: cells.indices.contains(tableIndex) ? cells[tableIndex] : "",
                id: idIndex.flatMap { cells.indices.contains($0) ? cells[$0] : nil }
            )
        }

        let normalized = GuestCatalog.normalize(rawGuests)
        return ImportResult(
            guests: normalized.guests,
            droppedDuplicates: normalized.droppedDuplicates,
            importedRows: rawGuests.count
        )
    }

    /// Mirrors `toCsv`: header row then values, quoting any cell containing `"`, `,`, or newlines
    /// and doubling embedded quotes. Rows are joined with `\n`.
    static func export(rows: [[String: String]], columns: [String]) -> String {
        func escape(_ value: String) -> String {
            let needsQuote = value.contains(where: { $0 == "\"" || $0 == "," || $0 == "\n" || $0 == "\r" })
            guard needsQuote else { return value }
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }

        var lines = [columns.joined(separator: ",")]
        for row in rows {
            lines.append(columns.map { escape(row[$0] ?? "") }.joined(separator: ","))
        }
        return lines.joined(separator: "\n")
    }
}
