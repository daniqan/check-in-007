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

    /// Assert that a required accessibility element appears, retaining the hierarchy only on failure.
    @discardableResult
    private func requireExists(
        _ element: XCUIElement,
        timeout: TimeInterval,
        file: StaticString = #filePath,
        line: UInt = #line
    ) -> Bool {
        let exists = element.waitForExistence(timeout: timeout)
        if !exists {
            let attachment = XCTAttachment(string: app.debugDescription)
            attachment.name = "Accessibility hierarchy after missing \(element)"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        XCTAssertTrue(exists, file: file, line: line)
        return exists
    }

    func testFirstCheckInFlow() {
        waitForRoster()
        let firstRow = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
        ).firstMatch
        requireExists(firstRow, timeout: 5)
        firstRow.tap()

        let scan = app.staticTexts[A11yId.scanStatus]
        requireExists(scan, timeout: 5)

        let result = app.staticTexts[A11yId.resultTitle]
        requireExists(result, timeout: 10)

        // Returns to roster after the result timer.
        requireExists(
            app.buttons.matching(
                NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
            ).firstMatch,
            timeout: 10
        )
    }

    func testRepeatGuestDoesNotDuplicateOneScan() {
        waitForRoster()
        let firstRow = app.buttons.matching(
            NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
        ).firstMatch
        requireExists(firstRow, timeout: 5)
        let rowId = firstRow.identifier
        firstRow.tap()
        requireExists(app.staticTexts[A11yId.resultTitle], timeout: 10)

        let sameRow = app.buttons[rowId]
        requireExists(sameRow, timeout: 10)
        sameRow.tap()
        requireExists(app.staticTexts[A11yId.resultTitle], timeout: 10)
    }

    func testAdminOpensToggleAudioAndCloses() {
        waitForRoster()
        let mark = app.buttons[A11yId.mark007]
        requireExists(mark, timeout: 5)
        mark.press(forDuration: 2.2)

        let sheet = app.otherElements[A11yId.adminSheet]
        requireExists(sheet, timeout: 5)
        let toggle = app.switches[A11yId.audioToggle]
        if toggle.waitForExistence(timeout: 3) { toggle.tap() }

        app.buttons[A11yId.adminClose].tap()
        requireExists(
            app.buttons.matching(
                NSPredicate(format: "identifier BEGINSWITH %@", A11yId.rosterRowPrefix)
            ).firstMatch,
            timeout: 5
        )
    }

    func testClearLogRequiresTwoConfirmations() {
        waitForRoster()
        let mark = app.buttons[A11yId.mark007]
        requireExists(mark, timeout: 5)
        mark.press(forDuration: 2.2)
        let sheet = app.otherElements[A11yId.adminSheet]
        requireExists(sheet, timeout: 5)
        sheet.swipeUp()

        let clear = app.buttons[A11yId.clearLog]
        requireExists(clear, timeout: 3)
        clear.tap()
        // After the first tap the control re-identifies as the confirm affordance.
        requireExists(app.buttons[A11yId.clearLogConfirm], timeout: 3)
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
