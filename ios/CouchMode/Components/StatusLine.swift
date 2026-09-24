import SwiftUI

/// Icon + short status word + optional detail, e.g. "👁 Watched · S1 E3 · Pilot".
/// The label word is hidden when `hideLabel` is set and a detail stands in for it.
struct StatusLine: View {
    var systemImage: String
    var label: String
    var detail: String?
    var hideLabel = false
    var color: Color = .secondary

    var body: some View {
        let showLabel = !hideLabel || detail == nil
        HStack(spacing: 4) {
            Image(systemName: systemImage)
                .accessibilityLabel(label)
            if showLabel {
                Text(label).fontWeight(.semibold)
            }
            if let detail {
                Text(showLabel ? "· \(detail)" : detail)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        }
        .font(.caption)
        .foregroundStyle(color)
    }
}

/// Thin rounded progress track.
struct ProgressTrack: View {
    var fraction: Double
    var height: CGFloat = 3

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.2))
                Capsule().fill(Color.accentColor)
                    .frame(width: geo.size.width * min(max(fraction, 0), 1))
            }
        }
        .frame(height: height)
        .accessibilityElement()
        .accessibilityLabel("Progress")
        .accessibilityValue("\(Int(fraction * 100)) percent")
    }
}

/// A big number with a caption, used on History and show detail.
struct StatCard: View {
    var value: String
    var label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.title.bold())
                .foregroundStyle(Color.accentColor)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/// Small capsule tag, e.g. the rewatch number "↻ #2".
struct Pill: View {
    var text: String
    var systemImage: String?
    var tint: Color = .accentColor

    var body: some View {
        HStack(spacing: 3) {
            if let systemImage { Image(systemName: systemImage) }
            Text(text)
        }
        .font(.caption2.weight(.semibold))
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .foregroundStyle(tint)
        .background(tint.opacity(0.12), in: Capsule())
    }
}

/// "This product uses the TMDB API…" — required by TMDB's terms.
struct TMDBAttribution: View {
    var body: some View {
        Text("Show data and images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.")
            .font(.caption2)
            .foregroundStyle(.secondary)
    }
}
