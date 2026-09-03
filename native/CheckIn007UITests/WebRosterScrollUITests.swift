import XCTest

/// Drives mobile Safari against the web kiosk probe URL and asserts that a real press-drag changes
/// the roster list's exposed scrollTop oracle.
final class WebRosterScrollUITests: XCTestCase {
    private var safari: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.launch()
    }

    func testRosterScrollsInMobileSafari() throws {
        let url = try XCTUnwrap(
            ProcessInfo.processInfo.environment["CHECKIN007_IOS_PROBE_URL"],
            "CHECKIN007_IOS_PROBE_URL must point to the hashed kiosk artifact with ?scrollProbe=1"
        )
        open(url)
        dismissSafariPrompts()
        if ProcessInfo.processInfo.environment["CHECKIN007_ALLOW_SELF_SIGNED_HTTPS"] == "1" {
            continuePastSelfSignedWarningIfPresent()
        }

        let initial = probeText(containing: "scroll-probe:0", timeout: 20)
        XCTAssertTrue(initial.exists, "Probe must load before the drag begins")

        let webView = safari.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 10), "Safari web view must be visible")
        let start = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.78))
        let end = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.22))
        start.press(forDuration: 0.18, thenDragTo: end)

        let moved = probeText(matching: #"scroll-probe:([1-9][0-9]*)"#, timeout: 10)
        XCTAssertTrue(moved.exists, "Probe text must report positive scrollTop after a touch drag")
    }

    private func open(_ url: String) {
        let address = safari.textFields.firstMatch
        if address.waitForExistence(timeout: 5) {
            address.tap()
            address.typeText(url + "\n")
            return
        }
        safari.typeText(url + "\n")
    }

    private func probeText(containing text: String, timeout: TimeInterval) -> XCUIElement {
        let predicate = NSPredicate(format: "label CONTAINS %@", text)
        let element = safari.webViews.staticTexts.matching(predicate).firstMatch
        _ = element.waitForExistence(timeout: timeout)
        return element
    }

    private func probeText(matching pattern: String, timeout: TimeInterval) -> XCUIElement {
        let predicate = NSPredicate(format: "label MATCHES %@", pattern)
        let element = safari.webViews.staticTexts.matching(predicate).firstMatch
        _ = element.waitForExistence(timeout: timeout)
        return element
    }

    private func dismissSafariPrompts() {
        for label in ["Continue", "Not Now", "Close", "Done"] {
            let button = safari.buttons[label]
            if button.waitForExistence(timeout: 1) {
                button.tap()
            }
        }
    }

    private func continuePastSelfSignedWarningIfPresent() {
        let details = safari.buttons["Show Details"]
        if details.waitForExistence(timeout: 3) {
            details.tap()
        }
        for label in ["visit this website", "Visit Website"] {
            let button = safari.buttons[label]
            if button.waitForExistence(timeout: 2) {
                button.tap()
            }
        }
    }
}
