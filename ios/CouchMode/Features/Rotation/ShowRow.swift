import CouchModeCore
import CouchModeData
import SwiftUI

/// A show in Watching / Caught Up / Done. Port of the web app's ShowCard:
/// status line, progress bar, a +1 quick-log button, and swipe-to-log.
struct ShowRow: View {
    let state: ShowState
    var showStatusLabel = true
    var onLog: () -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @State private var episodeTitle: String? = nil
    @State private var isLogging = false

    var body: some View {
        NavigationLink(value: ShowRoute(show: state.show)) {
            HStack(spacing: 12) {
                PosterImage(url: TMDBImage.storedPosterURL(state.show.posterUrl))
                VStack(alignment: .leading, spacing: 4) {
                    Text(state.show.title)
                        .font(.body.weight(.semibold))
                        .lineLimit(2)
                    status
                    if state.isWatching {
                        ProgressTrack(fraction: Double(state.percentComplete) / 100)
                            .padding(.top, 2)
                        Text(progressCaption)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(Color.accentColor)
                    }
                }
                Spacer(minLength: 4)
                HStack(spacing: 10) {
                    if state.isWatching, let next = state.nextEpisode {
                        Button {
                            isLogging = true
                            Task {
                                await EpisodeLogger.log(state, next, library: library, toasts: services.toasts)
                                isLogging = false
                            }
                        } label: {
                            Text("+1")
                                .font(.footnote.bold())
                                .frame(width: 34, height: 34)
                                .background(Color.accentColor, in: Circle())
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.borderless)
                        .disabled(isLogging)
                        .opacity(isLogging ? 0.5 : 1)
                        .accessibilityLabel("Log \(Formatting.progress(next)) of \(state.show.title)")
                    }
                    Pill(text: "#\(state.rewatchNumber)", systemImage: "arrow.clockwise")
                        .accessibilityLabel("Rewatch \(state.rewatchNumber)")
                }
            }
            .padding(.vertical, 4)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            if state.activeRewatch != nil {
                Button(action: onLog) {
                    Label("Log", systemImage: "play.fill")
                }
                .tint(.accentColor)
            }
        }
        .task(id: state.currentProgress.map { EpisodeRef($0) }) {
            guard let current = state.currentProgress else { episodeTitle = nil; return }
            episodeTitle = await SeasonLoader.episode(
                tmdbId: state.show.tmdbId, season: current.season, episode: current.episode, services: services
            )?.name
        }
    }

    @ViewBuilder
    private var status: some View {
        if let current = state.currentProgress {
            StatusLine(
                systemImage: "eye",
                label: "Watched",
                detail: Formatting.progress(current) + (episodeTitle.map { " · \($0)" } ?? ""),
                hideLabel: !showStatusLabel
            )
        } else if state.isDone {
            StatusLine(
                systemImage: "checkmark.circle",
                label: "Completed",
                detail: state.lastCompletedAt.map { Formatting.monthYear($0) },
                hideLabel: !showStatusLabel
            )
        } else {
            StatusLine(systemImage: "circle", label: "Not started")
        }
    }

    private var progressCaption: String {
        if state.isCaughtUp, let line = Formatting.airStatus(state.show.airStatus) {
            return line
        }
        return "\(state.percentComplete)% through show"
    }
}

/// A not-yet-started show in Up Next. Swipe right to start, left to remove;
/// long-press to reorder.
struct QueueRow: View {
    let state: ShowState
    let position: Int
    var onStart: () -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @State private var confirmRemove = false

    var body: some View {
        NavigationLink(value: ShowRoute(show: state.show)) {
            HStack(spacing: 12) {
                PosterImage(url: TMDBImage.storedPosterURL(state.show.posterUrl))
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.show.title)
                        .font(.body.weight(.semibold))
                        .lineLimit(2)
                    Text("Not started")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Pill(text: "#\(position)", tint: .secondary)
                    .accessibilityLabel("Position \(position)")
            }
            .padding(.vertical, 4)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button(action: onStart) {
                Label("Start", systemImage: "play.fill")
            }
            .tint(.accentColor)
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                confirmRemove = true
            } label: {
                Label("Remove", systemImage: "trash")
            }
        }
        .confirmationDialog("Remove \(state.show.title)?", isPresented: $confirmRemove, titleVisibility: .visible) {
            Button("Remove", role: .destructive) {
                Task {
                    do { try await library.removeShow(state.show) } catch { services.toasts.error(error) }
                }
            }
        } message: {
            Text("All rewatch history will be permanently deleted.")
        }
    }
}
