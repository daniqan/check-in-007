import Foundation

/// A single check-in event. Mirrors the web log row shape (`checkin007.log.v1`): the columns are
/// exactly `visitId, guestId, name, table, timestamp`. `visitId` is the idempotency key — one
/// visit produces exactly one entry regardless of repeated appends.
struct CheckInEntry: Codable, Equatable, Identifiable {
    var visitId: String
    var guestId: String
    var name: String
    var table: String
    var timestamp: String

    var id: String { visitId }
}
