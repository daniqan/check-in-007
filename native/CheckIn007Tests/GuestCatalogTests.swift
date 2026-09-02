import XCTest

@testable import CheckIn007

final class GuestCatalogTests: XCTestCase {
    func testSlugifyFoldsAccentsAndPunctuation() {
        XCTAssertEqual(SearchNormalizer.slugify(" Renée Aubénas! "), "renee-aubenas")
        XCTAssertEqual(SearchNormalizer.slugify("   "), "guest")
    }

    func testFoldIsDiacriticAndCaseInsensitiveAndCollapsesWhitespace() {
        XCTAssertEqual(SearchNormalizer.fold("  Renée   AUBÉNAS "), "renee aubenas")
    }

    func testNormalizeDropsDuplicateNamesAndSuffixesCollidingIds() {
        let (guests, dropped) = GuestCatalog.normalize([
            RawGuest(name: "Ava", table: "One", id: "agent"),
            RawGuest(name: "Bea", table: "Two", id: "agent"),
            RawGuest(name: " ava ", table: "Three"),
        ])
        XCTAssertEqual(guests.map(\.id), ["agent", "agent-2"])
        XCTAssertEqual(dropped, 1)
    }

    func testNormalizeGeneratesIdFromNameWhenIdAbsent() {
        let (guests, _) = GuestCatalog.normalize([RawGuest(name: "Renée Aubénas", table: "Casino")])
        XCTAssertEqual(guests.first?.id, "renee-aubenas")
        XCTAssertEqual(guests.first?.searchText, "renee aubenas casino")
    }

    func testFilterMatchesFoldedSubstringAndEmptyQueryReturnsAll() {
        let (guests, _) = GuestCatalog.normalize([
            RawGuest(name: "Renée Aubénas", table: "Casino Royale"),
            RawGuest(name: "Miles Archer", table: "Skyfall"),
        ])
        XCTAssertEqual(GuestCatalog.filter(guests, query: "renee").count, 1)
        XCTAssertEqual(GuestCatalog.filter(guests, query: "casino").count, 1)
        XCTAssertEqual(GuestCatalog.filter(guests, query: "").count, 2)
    }

    func testBlankNamesAreSkipped() {
        let (guests, _) = GuestCatalog.normalize([
            RawGuest(name: "   ", table: "One"),
            RawGuest(name: "Valid", table: "Two"),
        ])
        XCTAssertEqual(guests.map(\.name), ["Valid"])
    }
}
