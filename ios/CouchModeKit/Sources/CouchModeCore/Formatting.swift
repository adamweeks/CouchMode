import Foundation

/// Display formatting shared across screens. Mirrors the formatting helpers in
/// the web app's src/lib/progressLogic.ts. Formats default to en_US to match
/// the web app's copy; pass another locale to localize.
public enum Formatting {
    public static func progress(season: Int, episode: Int) -> String {
        "S\(season) E\(episode)"
    }

    public static func progress(_ position: some EpisodePositioned) -> String {
        progress(season: position.season, episode: position.episode)
    }

    /// `"Jun 2026"`.
    public static func monthYear(_ date: Date, locale: Locale = Locale(identifier: "en_US"), timeZone: TimeZone = .current) -> String {
        formatter("MMM yyyy", locale: locale, timeZone: timeZone).string(from: date)
    }

    /// `"Same day"`, `"1 day"`, `"12 days"`.
    public static func duration(from startedAt: Date, to completedAt: Date) -> String {
        let days = Int((completedAt.timeIntervalSince(startedAt) / 86_400).rounded())
        switch days {
        case 0: return "Same day"
        case 1: return "1 day"
        default: return "\(days) days"
        }
    }

    /// Whole calendar days from `now` until `dateString` (YYYY-MM-DD), compared
    /// at local midnight so "today" is 0 and past dates are negative. Nil when
    /// the string isn't a date.
    public static func daysUntil(_ dateString: String, now: Date, calendar: Calendar = .current) -> Int? {
        guard let target = localDate(dateString, calendar: calendar) else { return nil }
        let today = calendar.startOfDay(for: now)
        return calendar.dateComponents([.day], from: today, to: target).day
    }

    /// Air-status line for a caught-up show: `"Next: S2 E1 · in 3 days"`,
    /// `"New episode aired 2 days ago · S2 E1"`, or `"Caught up"`. Nil when
    /// there's no air data at all.
    public static func airStatus(
        _ air: AirStatus?,
        now: Date = Date(),
        calendar: Calendar = .current,
        locale: Locale = Locale(identifier: "en_US")
    ) -> String? {
        guard let air else { return nil }

        if let next = air.nextEpisode, let airDate = next.airDate, let days = daysUntil(airDate, now: now, calendar: calendar) {
            let ep = progress(next)
            if days <= 0 { return "New episode out now · \(ep)" }
            let when: String
            if days == 1 {
                when = "tomorrow"
            } else if days <= 7 {
                when = "in \(days) days"
            } else {
                when = formatter("MMM d", locale: locale, timeZone: calendar.timeZone)
                    .string(from: localDate(airDate, calendar: calendar)!)
            }
            return "Next: \(ep) · \(when)"
        }

        if let last = air.lastAired, let airDate = last.airDate, let days = daysUntil(airDate, now: now, calendar: calendar), days >= -10 {
            let ep = progress(last)
            let when = days == 0 ? "today" : days == -1 ? "yesterday" : "\(-days) days ago"
            return "New episode aired \(when) · \(ep)"
        }

        return "Caught up"
    }

    /// Air-date line for a single episode: `"Airs tomorrow"`, `"Airs in 3 days"`,
    /// `"Airs Oct 3, 2026"`, `"Airs today"`, or `"Aired Oct 3, 2026"`.
    public static func episodeAirDate(
        _ airDate: String?,
        now: Date = Date(),
        calendar: Calendar = .current,
        locale: Locale = Locale(identifier: "en_US")
    ) -> String? {
        guard let airDate, let days = daysUntil(airDate, now: now, calendar: calendar),
              let date = localDate(airDate, calendar: calendar) else { return nil }
        let formatted = formatter("MMM d, yyyy", locale: locale, timeZone: calendar.timeZone).string(from: date)
        if days > 0 {
            if days == 1 { return "Airs tomorrow" }
            if days <= 7 { return "Airs in \(days) days" }
            return "Airs \(formatted)"
        }
        if days == 0 { return "Airs today" }
        return "Aired \(formatted)"
    }

    /// The first four characters of a TMDB `first_air_date`, if present.
    public static func year(_ firstAirDate: String?) -> String? {
        guard let firstAirDate, firstAirDate.count >= 4 else { return nil }
        return String(firstAirDate.prefix(4))
    }

    // MARK: - Helpers

    /// Local midnight for a `YYYY-MM-DD` string.
    static func localDate(_ dateString: String, calendar: Calendar) -> Date? {
        let parts = dateString.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func formatter(_ format: String, locale: Locale, timeZone: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = timeZone
        f.dateFormat = format
        return f
    }
}
