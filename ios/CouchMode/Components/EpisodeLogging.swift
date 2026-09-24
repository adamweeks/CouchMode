import CouchModeCore
import CouchModeData
import SwiftUI
import UIKit

/// Logging with the same feedback as the web app's useLogEpisodeSheet: a
/// toast (with Undo for regular logs), a celebration when the series is
/// finished, and a haptic tap.
@MainActor
enum EpisodeLogger {
    static func log(_ state: ShowState, _ episode: EpisodeRef, library: LibraryStore, toasts: ToastCenter) async {
        let label = Formatting.progress(episode)
        do {
            let result = try await library.logEpisode(state, season: episode.season, episode: episode.episode)
            if result.completedSeries {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                toasts.show("\(label) logged — series complete! 🎉", style: .success)
            } else {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                let ids = result.insertedIds
                toasts.show(
                    "\(state.show.title) · \(label) ✓",
                    duration: 4,
                    actionTitle: ids.isEmpty ? nil : "Undo"
                ) {
                    Task {
                        do {
                            try await library.undoLog(ids: ids)
                            toasts.show("Log removed", duration: 2)
                        } catch {
                            toasts.error(error)
                        }
                    }
                }
            }
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            toasts.error(error)
        }
    }
}

/// The "Log" action sheet (swipe a row, or long-press Continue Watching):
/// log next, pick a specific episode, or mark the current season complete.
/// Port of the web app's useLogEpisodeSheet.
private struct LogActionsModifier: ViewModifier {
    @Binding var item: ShowState?
    var onPickEpisode: (ShowState) -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(ToastCenter.self) private var toasts

    func body(content: Content) -> some View {
        content.confirmationDialog(
            item?.show.title ?? "Log Episode",
            isPresented: Binding(get: { item != nil }, set: { if !$0 { item = nil } }),
            titleVisibility: .visible,
            presenting: item
        ) { state in
            if let next = state.nextEpisode {
                Button("Log Next Episode (\(Formatting.progress(next)))") {
                    Task { await EpisodeLogger.log(state, next, library: library, toasts: toasts) }
                }
            }
            Button("Pick Specific Episode…") { onPickEpisode(state) }
            if state.activeRewatch != nil {
                let season = state.currentProgress?.season ?? 1
                let lastEpisode = state.show.episodesPerSeason[safe: season - 1] ?? 1
                Button("Mark Season \(season) Complete") {
                    Task {
                        await EpisodeLogger.log(state, EpisodeRef(season: season, episode: lastEpisode),
                                                library: library, toasts: toasts)
                    }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: { state in
            if let current = state.currentProgress {
                Text("Currently \(Formatting.progress(current))")
            }
        }
    }
}

extension View {
    /// Presents the log action sheet for `item` while it's non-nil.
    func logActions(for item: Binding<ShowState?>, onPickEpisode: @escaping (ShowState) -> Void) -> some View {
        modifier(LogActionsModifier(item: item, onPickEpisode: onPickEpisode))
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

/// Loads one season's episode list from the TMDB proxy (cached in TMDBService).
@MainActor
enum SeasonLoader {
    static func episode(tmdbId: String, season: Int, episode: Int, services: AppServices) async -> TMDBEpisode? {
        guard season > 0 else { return nil }
        return try? await services.tmdb.season(tmdbId: tmdbId, season: season).episode(episode)
    }
}
