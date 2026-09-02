import Foundation

/// A normalized guest as stored in the bundled roster JSON and shown in the roster list.
/// Mirrors the web app's normalized guest shape (`src/lib/roster.mjs`): a stable generated
/// `id`, the display `name`/`table`, and a pre-folded `searchText` used for filtering.
struct Guest: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var table: String
    var searchText: String
}

/// A raw guest row before normalization — the shape produced by the default roster source and
/// by CSV import. `id` is optional; when absent it is generated from `name` via `slugify`,
/// exactly like the web app's `normalizeGuests`.
struct RawGuest: Codable, Equatable {
    var name: String
    var table: String
    var id: String?

    init(name: String, table: String, id: String? = nil) {
        self.name = name
        self.table = table
        self.id = id
    }
}
