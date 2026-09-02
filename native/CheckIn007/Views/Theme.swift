import SwiftUI

/// Shared colors, spacing, typography, timing, and accessibility identifiers for the native kiosk.
/// The look is faithful to the web app's black kiosk shell and 007 topbar, not byte-for-byte CSS.
enum Theme {
    static let background = Color.black
    static let surface = Color(white: 0.08)
    static let accent = Color(red: 0.83, green: 0.69, blue: 0.22) // muted gold "007" mark
    static let primaryText = Color.white
    static let secondaryText = Color(white: 0.72)

    enum Spacing {
        static let tight: CGFloat = 8
        static let regular: CGFloat = 16
        static let loose: CGFloat = 24
        static let minimumHitTarget: CGFloat = 44
    }

    enum Typography {
        static let title = Font.system(size: 34, weight: .bold, design: .default)
        static let heading = Font.system(size: 24, weight: .semibold)
        static let body = Font.system(size: 18, weight: .regular)
        static let caption = Font.system(size: 14, weight: .regular).monospaced()
    }
}

/// Native timing constants. Mirrors `src/config.mjs` `TIMING` (standard) and `REDUCED` (Reduce
/// Motion) exactly, so the loading → scan → result sequence is deterministic and testable.
enum Timing {
    static let loadingMs = 2600
    static let loadingReducedMs = 900
    static let scanMs = 4500
    static let scanReducedMs = 2500
    static let resultMs = 5000
    static let resultReducedMs = 4000
    static let transitionMs = 500
    static let transitionReducedMs = 150

    /// Pick the standard or reduced value based on the Reduce Motion setting.
    static func loading(reduceMotion: Bool) -> Int { reduceMotion ? loadingReducedMs : loadingMs }
    static func scan(reduceMotion: Bool) -> Int { reduceMotion ? scanReducedMs : scanMs }
    static func result(reduceMotion: Bool) -> Int { reduceMotion ? resultReducedMs : resultMs }
    static func transition(reduceMotion: Bool) -> Int {
        reduceMotion ? transitionReducedMs : transitionMs
    }
}

/// Stable accessibility identifiers referenced by `CheckIn007UITests`.
enum A11y {
    static let rosterSearch = "roster.search"
    static let rosterRowPrefix = "roster.row."
    static let mark007 = "roster.mark007"
    static let scanStatus = "scan.status"
    static let resultTitle = "result.title"
    static let adminSheet = "admin.sheet"
    static let adminClose = "admin.close"
    static let exportCsv = "admin.export.csv"
    static let exportJson = "admin.export.json"
    static let importRoster = "admin.import.roster"
    static let resetRoster = "admin.reset.roster"
    static let mergePreview = "admin.merge.preview"
    static let mergeApply = "admin.merge.apply"
    static let clearLog = "admin.clearLog"
    static let clearLogConfirm = "admin.clearLog.confirm"
    static let audioToggle = "admin.audioToggle"

    static func rosterRow(_ guestId: String) -> String { rosterRowPrefix + guestId }
}
