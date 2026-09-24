import Foundation

/// What the "Continue Watching" card highlights.
public enum ResumeCardMode: String, Codable, CaseIterable, Sendable {
    case upNext = "up-next"
    case lastWatched = "last-watched"
}

/// Per-user app options, synced to the `user_preferences` table as a JSONB
/// blob shared with the web app (see src/contexts/PreferencesContext.tsx).
/// Decoding keeps only well-typed known keys and falls back to defaults for
/// anything missing or malformed, so an old or corrupt blob can't break the app.
public struct Preferences: Codable, Hashable, Sendable {
    public var showResumeCard: Bool
    public var resumeCardMode: ResumeCardMode
    public var showDoneSection: Bool

    public static let `default` = Preferences(showResumeCard: true, resumeCardMode: .upNext, showDoneSection: true)

    public init(showResumeCard: Bool, resumeCardMode: ResumeCardMode, showDoneSection: Bool) {
        self.showResumeCard = showResumeCard
        self.resumeCardMode = resumeCardMode
        self.showDoneSection = showDoneSection
    }

    enum CodingKeys: String, CodingKey {
        case showResumeCard, resumeCardMode, showDoneSection
    }

    public init(from decoder: Decoder) throws {
        let d = Preferences.default
        let c = try? decoder.container(keyedBy: CodingKeys.self)
        showResumeCard = (try? c?.decodeIfPresent(Bool.self, forKey: .showResumeCard)) ?? d.showResumeCard
        resumeCardMode = (try? c?.decodeIfPresent(ResumeCardMode.self, forKey: .resumeCardMode)) ?? d.resumeCardMode
        showDoneSection = (try? c?.decodeIfPresent(Bool.self, forKey: .showDoneSection)) ?? d.showDoneSection
    }
}

/// Where a rewatch was watched. Names match TMDB `provider_name` values.
public enum StreamingServices {
    public static let standard = [
        "Netflix",
        "Hulu",
        "Disney Plus",
        "Max",
        "Apple TV Plus",
        "Peacock Premium",
        "Paramount Plus",
        "Amazon Prime Video",
        "Tubi TV",
        "Crunchyroll",
    ]

    public static let physicalOrPurchased = [
        "Blu-ray / DVD",
        "iTunes / Apple TV",
        "Amazon (purchased)",
        "Vudu / Fandango At Home",
        "Google Play / YouTube",
    ]

    /// The picker list: the show's TMDB providers first, then the remaining
    /// standard and physical/purchased options.
    public static func options(availableOn: [String] = []) -> [String] {
        let all = standard + physicalOrPurchased
        guard !availableOn.isEmpty else { return all }
        return availableOn + all.filter { !availableOn.contains($0) }
    }
}
