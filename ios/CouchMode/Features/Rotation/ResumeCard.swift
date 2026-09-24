import CouchModeCore
import CouchModeData
import SwiftUI

/// "Continue Watching" — the most recently active show, with one-tap logging
/// of the next episode. Whether it names the next episode or the last one
/// watched is a user preference.
struct ResumeCard: View {
    let state: ShowState
    let mode: ResumeCardMode
    var onMoreOptions: () -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @State private var episodeName: String? = nil
    @State private var isLogging = false

    private var displayed: EpisodeRef? {
        switch mode {
        case .upNext: state.nextEpisode
        case .lastWatched: state.currentProgress.map { EpisodeRef($0) }
        }
    }

    var body: some View {
        if let next = state.nextEpisode, let displayed {
            HStack(spacing: 12) {
                NavigationLink(value: ShowRoute(show: state.show)) {
                    HStack(spacing: 12) {
                        PosterImage(url: TMDBImage.storedPosterURL(state.show.posterUrl))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Continue Watching")
                                .font(.caption2.weight(.bold))
                                .textCase(.uppercase)
                                .foregroundStyle(Color.accentColor)
                            Text(state.show.title)
                                .font(.headline)
                                .lineLimit(1)
                                .foregroundStyle(.primary)
                            StatusLine(
                                systemImage: mode == .lastWatched ? "clock" : "forward.end",
                                label: mode == .lastWatched ? "Last watched" : "Up next",
                                detail: Formatting.progress(displayed) + (episodeName.map { " · \($0)" } ?? "")
                            )
                        }
                        Spacer(minLength: 0)
                    }
                }
                .buttonStyle(.plain)

                Button {
                    isLogging = true
                    Task {
                        await EpisodeLogger.log(state, next, library: library, toasts: services.toasts)
                        isLogging = false
                    }
                } label: {
                    Label("Log", systemImage: "play.fill")
                        .font(.subheadline.bold())
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .disabled(isLogging)
                .contextMenu {
                    Button("More Options…", systemImage: "ellipsis.circle", action: onMoreOptions)
                }
            }
            .padding(12)
            .background(
                LinearGradient(
                    colors: [Color.accentColor.opacity(0.14), Color.accentColor.opacity(0.04)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.accentColor.opacity(0.25))
            )
            .task(id: displayed) {
                episodeName = await SeasonLoader.episode(
                    tmdbId: state.show.tmdbId, season: displayed.season, episode: displayed.episode, services: services
                )?.name
            }
        }
    }
}
