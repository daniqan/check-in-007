import Foundation

/// Diacritic-insensitive text folding and ID slugging. A faithful port of the web app's
/// `foldText`/`slugify` (`src/lib/roster.mjs`) so native search, dedupe, and generated IDs match
/// the web client byte-for-byte.
enum SearchNormalizer {
    /// Mirrors `foldText`: NFD-decompose, strip combining diacritics (U+0300…U+036F), lowercase,
    /// collapse whitespace runs to a single space, and trim.
    static func fold(_ value: String) -> String {
        let decomposed = value.decomposedStringWithCanonicalMapping
        let withoutMarks = decomposed.unicodeScalars.filter { scalar in
            !(0x0300...0x036F).contains(scalar.value)
        }
        let lowered = String(String.UnicodeScalarView(withoutMarks)).lowercased()
        return lowered.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    /// Mirrors `slugify`: fold, replace every run of non `[a-z0-9]` with a single `-`, strip
    /// leading/trailing dashes, and fall back to `guest` when the result is empty.
    static func slugify(_ value: String) -> String {
        let folded = fold(value)
        var slug = ""
        var pendingDash = false
        for character in folded {
            if ("a"..."z").contains(character) || ("0"..."9").contains(character) {
                slug.append(character)
                pendingDash = false
            } else if !pendingDash {
                slug.append("-")
                pendingDash = true
            }
        }
        while slug.hasPrefix("-") { slug.removeFirst() }
        while slug.hasSuffix("-") { slug.removeLast() }
        return slug.isEmpty ? "guest" : slug
    }
}
