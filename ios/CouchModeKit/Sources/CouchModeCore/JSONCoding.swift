import Foundation

/// JSON coders matching Supabase/PostgREST: timestamps are ISO 8601 with
/// optional fractional seconds (Postgres emits microseconds) and a UTC offset.
public enum CouchModeJSON {
    public static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let c = try decoder.singleValueContainer()
            let s = try c.decode(String.self)
            guard let date = parseTimestamp(s) else {
                throw DecodingError.dataCorruptedError(in: c, debugDescription: "Unrecognized timestamp: \(s)")
            }
            return date
        }
        return d
    }

    public static var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .custom { date, encoder in
            var c = encoder.singleValueContainer()
            try c.encode(formatTimestamp(date))
        }
        return e
    }

    public static func formatTimestamp(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: date)
    }

    /// Parses `2026-06-01T12:34:56.123456+00:00`, `...Z`, no-fraction and
    /// space-separated variants, and bare `YYYY-MM-DD` dates (as UTC midnight).
    public static func parseTimestamp(_ raw: String) -> Date? {
        var s = raw.replacingOccurrences(of: " ", with: "T")
        if s.count == 10 { s += "T00:00:00Z" }

        // Normalise the fraction to milliseconds; ISO8601DateFormatter only
        // reliably handles three digits.
        if let dot = s.firstIndex(of: ".") {
            let afterDot = s.index(after: dot)
            let end = s[afterDot...].firstIndex { !$0.isNumber } ?? s.endIndex
            var digits = String(s[afterDot..<end])
            digits = String((digits + "000").prefix(3))
            s = String(s[..<afterDot]) + digits + String(s[end...])
        }
        // A bare "+00" offset → "+00:00".
        if let match = s.range(of: #"[+-]\d{2}$"#, options: .regularExpression) {
            s.replaceSubrange(match, with: s[match] + ":00")
        }
        // No offset at all → treat as UTC.
        if s.range(of: #"(Z|[+-]\d{2}:?\d{2})$"#, options: .regularExpression) == nil {
            s += "Z"
        }

        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFraction.date(from: s) { return d }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: s)
    }
}
