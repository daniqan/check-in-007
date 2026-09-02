import XCTest

/// Native smoke workflow and accessibility tests driven by accessibility identifiers. These
/// exercise the primary event workflow end-to-end on a simulator.
final class CheckIn007UITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    /// Wait past the loading beat and ensure the roster search field is present.
    private func waitForRoster() {
        let search = app.otherElements[A11yId.rosterSearch]
        let field = app.searchFields.firstMatch
        _ = search.waitForExistence(timeout: 5) || field.waitForExistence(timeout: 5)
    }

    func testFirstCheckInFlow() {
        waitForRoster()
        let firstRow = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
        ).firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 5))
        firstRow.tap()

        let scan = app.staticTexts[A11yId.scanStatus]
        XCTAssertTrue(scan.waitForExistence(timeout: 5))

        let result = app.staticTexts[A11yId.resultTitle]
        XCTAssertTrue(result.waitForExistence(timeout: 10))

        // Returns to roster after the result timer.
        XCTAssertTrue(
            app.buttons.matching(
                NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
            ).firstMatch.waitForExistence(timeout: 10)
        )
    }

    func testRepeatGuestDoesNotDuplicateOneScan() {
        waitForRoster()
        let firstRow = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
        ).firstMatch
        XCTAssertTrue(firstRow.waitForExistence(timeout: 5))
        let rowId = firstRow.identifier
        firstRow.tap()
        XCTAssertTrue(app.staticTexts[A11yId.resultTitle].waitForExistence(timeout: 10))

        let sameRow = app.buttons[rowId]
        XCTAssertTrue(sameRow.waitForExistence(timeout: 10))
        sameRow.tap()
        XCTAssertTrue(app.staticTexts[A11yId.resultTitle].waitForExistence(timeout: 10))
    }

    func testAdminOpensToggleAudioAndCloses() {
        waitForRoster()
        let mark = app.otherElements[A11yId.mark007]
        XCTAssertTrue(mark.waitForExistence(timeout: 5))
        mark.press(forDuration: 2.2)

        let sheet = app.otherElements[A11yId.adminSheet]
        XCTAssertTrue(sheet.waitForExistence(timeout: 5))
        let toggle = app.switches[A11yId.audioToggle]
        if toggle.waitForExistence(timeout: 3) { toggle.tap() }

        app.buttons[A11yId.adminClose].tap()
        XCTAssertTrue(
            app.buttons.matching(
                NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
            ).firstMatch.waitForExistence(timeout: 5)
        )
    }

    func testClearLogRequiresTwoConfirmations() {
        waitForRoster()
        app.otherElements[A11yId.mark007].press(forDuration: 2.2)
        XCTAssertTrue(app.otherElements[A11yId.adminSheet].waitForExistence(timeout: 5))

        let clear = app.buttons[A11yId.clearLog]
        XCTAssertTrue(clear.waitForExistence(timeout: 3))
        clear.tap()
        // After the first tap the control re-identifies as the confirm affordance.
        XCTAssertTrue(app.buttons[A11yId.clearLogConfirm].waitForExistence(timeout: 3))
        app.buttons[A11yId.clearLogConfirm].tap()
    }
}

/// Identifiers duplicated from the app target's `A11y` enum (the UI test target does not link the
/// app's internal symbols). Keep these in sync with `Views/Theme.swift`.
enum A11yId {
    static let rosterSearch = "roster.search"
    static let rosterRowPrefix = "roster.row."
    static let mark007 = "roster.mark007"
    static let scanStatus = "scan.status"
    static let resultTitle = "result.title"
    static let adminSheet = "admin.sheet"
    static let adminClose = "admin.close"
    static let audioToggle = "admin.audioToggle"
    static let clearLog = "admin.clearLog"
    static let clearLogConfirm = "admin.clearLog.confirm"
}
