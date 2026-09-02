import Foundation

/// Persisted, default-off scan-audio preference. Mirrors the web `checkin007.audio.v1` value
/// (`normalizeAudioSettings` in `src/lib/store.mjs`): only `scanBlipEnabled === true` enables the
/// cue; any malformed or missing value normalizes to disabled.
struct AudioSettings: Codable, Equatable {
    var scanBlipEnabled: Bool

    static let disabled = AudioSettings(scanBlipEnabled: false)

    /// Parse a stored JSON string like `{"scanBlipEnabled":true}`. Anything that is not an object
    /// with `scanBlipEnabled == true` normalizes to disabled — never throws.
    static func normalized(from raw: String?) -> AudioSettings {
        guard let raw, let data = raw.data(using: .utf8) else { return .disabled }
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return .disabled
        }
        return AudioSettings(scanBlipEnabled: (object["scanBlipEnabled"] as? Bool) == true)
    }

    /// Serialize to the same compact JSON the web app persists.
    func jsonString() -> String {
        "{\"scanBlipEnabled\":\(scanBlipEnabled)}"
    }
}
