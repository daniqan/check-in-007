import XCTest

@testable import CheckIn007

final class CSVCodecTests: XCTestCase {
    func testParsesBomCrlfQuotedCommasAndDoubledQuotes() throws {
        let input = "\u{FEFF}name,table\r\n\"Vale, Bianca\",\"Table \"\"3\"\"\"\r\n"
        let rows = try CSVCodec.parseRows(input)
        XCTAssertEqual(rows.count, 2)
        XCTAssertEqual(rows[1], ["Vale, Bianca", "Table \"3\""])
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
