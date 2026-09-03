import XCTest

@testable import CheckIn007

final class CSVCodecTests: XCTestCase {
    func testParsesBomCrlfQuotedCommasAndDoubledQuotes() throws {
        let input = "\u{FEFF}name,table\r\n\"Vale, Bianca\",\"Table \"\"3\"\"\"\r\n"
        let rows = try CSVCodec.parseRows(input)
        XCTAssertEqual(rows.count, 2)
        guard rows.count == 2 else { return }
        XCTAssertEqual(rows, [["name", "table"], ["Vale, Bianca", "Table \"3\""]])
    }

    func testMatchesWebParserAcrossLineEndingAndBlankRowCases() throws {
        let cases: [(name: String, input: String, expected: [[String]])] = [
            ("LF", "name,table\nAva,One", [["name", "table"], ["Ava", "One"]]),
            ("CRLF", "name,table\r\nAva,One", [["name", "table"], ["Ava", "One"]]),
            ("terminal CRLF", "name,table\r\nAva,One\r\n", [["name", "table"], ["Ava", "One"]]),
            ("quoted LF", "name,table\n\"Ava\nSterling\",One", [["name", "table"], ["Ava\nSterling", "One"]]),
            ("quoted CRLF", "name,table\r\n\"Ava\r\nSterling\",One", [["name", "table"], ["Ava\r\nSterling", "One"]]),
            ("blank records", "name,table\r\n\r\nAva,One\r\n\r\n", [["name", "table"], ["Ava", "One"]]),
            ("doubled quote", "name,table\nAva,\"Table \"\"3\"\"\"", [["name", "table"], ["Ava", "Table \"3\""]]),
        ]

        for testCase in cases {
            XCTAssertEqual(
                try CSVCodec.parseRows(testCase.input),
                testCase.expected,
                "Failed parity case: \(testCase.name)"
            )
        }
    }

    func testDropsBlankRows() throws {
        let rows = try CSVCodec.parseRows("name,table\n\n\nAva,One\n")
        XCTAssertEqual(rows.count, 2)
    }

    func testUnterminatedQuoteThrows() {
        XCTAssertThrowsError(try CSVCodec.parseRows("name,table\n\"oops,One")) { error in
            XCTAssertEqual(error as? CSVCodec.CSVError, .unterminatedQuote)
        }
    }

    func testParseGuestsRequiresNameAndTableAndTreatsIdOptional() throws {
        let result = try CSVCodec.parseGuests("name,table\nAva Sterling,Table 1\nAva Sterling,Table 2\n")
        XCTAssertEqual(result.guests.count, 1)
        XCTAssertEqual(result.droppedDuplicates, 1)
        XCTAssertEqual(result.importedRows, 2)
        XCTAssertEqual(result.guests.first?.id, "ava-sterling")
    }

    func testParseGuestsMissingColumnThrows() {
        XCTAssertThrowsError(try CSVCodec.parseGuests("name\nAva\n")) { error in
            XCTAssertEqual(error as? CSVCodec.CSVError, .missingColumn("table"))
        }
    }

    func testExportQuotesCellsWithSpecialCharacters() {
        let csv = CSVCodec.export(
            rows: [["name": "Vale, B", "table": "Line\nTwo"]],
            columns: ["name", "table"]
        )
        XCTAssertEqual(csv, "name,table\n\"Vale, B\",\"Line\nTwo\"")
    }
}
