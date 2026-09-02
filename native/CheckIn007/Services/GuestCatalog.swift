import Foundation

/// Loads the bundled default roster, normalizes raw guest rows (from the default source or CSV
/// import), and filters by folded search text. A faithful port of `normalizeGuests`/`filterGuests`
/// (`src/lib/roster.mjs`).
enum GuestCatalog {
    enum LoadError: Error, Equatable {
        case missingResource
        case decodeFailed
    }

    /// Mirrors `normalizeGuests`: skip blank names, drop later duplicate folded names (counting
    /// them), generate a `slugify`-based `id` from the requested id or the name, and suffix
    /// colliding ids `-2`, `-3`, …. `searchText` is `fold("name table")`.
    static func normalize(_ rows: [RawGuest]) -> (guests: [Guest], droppedDuplicates: Int) {
        var seenNames = Set<String>()
        var usedIds: [String: Int] = [:]
        var guests: [Guest] = []
        var droppedDuplicates = 0

        for row in rows {
            let name = row.name.trimmingCharacters(in: .whitespacesAndNewlines)
            if name.isEmpty { continue }

            let nameKey = SearchNormalizer.fold(name)
            if seenNames.contains(nameKey) {
                droppedDuplicates += 1
                continue
            }
            seenNames.insert(nameKey)

            let requestedId = (row.id ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let baseId = SearchNormalizer.slugify(requestedId.isEmpty ? name : requestedId)
            let count = usedIds[baseId] ?? 0
            usedIds[baseId] = count + 1
            let id = count == 0 ? baseId : "\(baseId)-\(count + 1)"

            let rawTable = row.table
            guests.append(
                Guest(
                    id: id,
                    name: name,
                    table: rawTable.trimmingCharacters(in: .whitespacesAndNewlines),
                    searchText: SearchNormalizer.fold("\(name) \(rawTable)")
                )
            )
        }

        return (guests, droppedDuplicates)
    }

    /// Load and decode the bundled `default-guests.json` (already normalized by the export script).
    static func loadDefaultGuests(bundle: Bundle = .main) throws -> [Guest] {
        guard let url = bundle.url(forResource: "default-guests", withExtension: "json") else {
            throw LoadError.missingResource
        }
        do {
            let data = try Data(contentsOf: url)
            return try JSONDecoder().decode([Guest].self, from: data)
        } catch {
            throw LoadError.decodeFailed
        }
    }

    /// Mirrors `filterGuests`: empty query returns all guests in order; otherwise a folded
    /// substring match against `searchText`.
    static func filter(_ guests: [Guest], query: String) -> [Guest] {
        let term = SearchNormalizer.fold(query)
        if term.isEmpty { return guests }
        return guests.filter { $0.searchText.contains(term) }
    }
}
