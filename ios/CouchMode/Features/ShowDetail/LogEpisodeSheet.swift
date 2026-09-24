import CouchModeCore
import CouchModeData
import SwiftUI

/// Pick a specific episode to log: seasons, then that season's episodes.
/// Logging an episode earlier than current progress asks for confirmation
/// ("I started over"). Port of the web app's LogProgressModal.
struct LogEpisodeSheet: View {
    let state: ShowState

    @Environment(\.dismiss) private var dismiss
    @State private var path: [Int] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                if let next = state.nextEpisode {
                    Section {
                        QuickLogButton(state: state, episode: next) { dismiss() }
                    }
                }
                Section("Seasons") {
                    ForEach(1...max(state.show.totalSeasons, 1), id: \.self) { season in
                        NavigationLink(value: season) {
                            seasonRow(season)
                        }
                    }
                }
            }
            .navigationTitle(state.show.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .navigationDestination(for: Int.self) { season in
                EpisodePickerList(state: state, season: season, onLogged: { dismiss() })
            }
        }
        .onAppear {
            // Open straight into the current season.
            if let current = state.currentProgress, path.isEmpty { path = [current.season] }
        }
        .presentationDragIndicator(.visible)
    }

    private func seasonRow(_ season: Int) -> some View {
        let count = state.show.episodesPerSeason[safe: season - 1] ?? 0
        let isCurrent = state.currentProgress?.season == season
        return VStack(alignment: .leading, spacing: 2) {
            Text("Season \(season)")
                .font(.body.weight(.semibold))
                .foregroundStyle(isCurrent ? Color.accentColor : .primary)
            Group {
                if isCurrent, let current = state.currentProgress {
                    Text("\(count) episode\(count == 1 ? "" : "s") · on episode \(current.episode)")
                } else {
                    Text("\(count) episode\(count == 1 ? "" : "s")")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }
}

private struct QuickLogButton: View {
    let state: ShowState
    let episode: EpisodeRef
    var onLogged: () -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @State private var isLogging = false

    var body: some View {
        Button {
            isLogging = true
            Task {
                await EpisodeLogger.log(state, episode, library: library, toasts: services.toasts)
                isLogging = false
                onLogged()
            }
        } label: {
            Label("Log Next Episode (\(Formatting.progress(episode)))", systemImage: "play.fill")
        }
        .disabled(isLogging)
    }
}

private struct EpisodePickerList: View {
    let state: ShowState
    @State var season: Int
    var onLogged: () -> Void

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services

    @State private var episodes: [TMDBEpisode]? = nil
    @State private var loadFailed = false
    @State private var isLogging = false
    @State private var regressionTarget: EpisodeRef? = nil

    var body: some View {
        List {
            if let episodes {
                ForEach(episodes) { episode in
                    row(episode)
                }
            } else if loadFailed {
                ContentUnavailableView("Couldn't load episodes", systemImage: "wifi.exclamationmark",
                                       description: Text("Check your connection and try again."))
            }
        }
        .overlay {
            if episodes == nil, !loadFailed { ProgressView() }
        }
        .navigationTitle("Season \(season)")
        .toolbar {
            ToolbarItemGroup(placement: .bottomBar) {
                Button {
                    season -= 1
                } label: {
                    Label("Season \(season - 1)", systemImage: "chevron.left")
                        .labelStyle(.titleAndIcon)
                }
                .disabled(season <= 1)
                Spacer()
                Button {
                    season += 1
                } label: {
                    HStack {
                        Text("Season \(season + 1)")
                        Image(systemName: "chevron.right")
                    }
                }
                .disabled(season >= state.show.totalSeasons)
            }
        }
        .task(id: season) { await load() }
        .alert("Going back?", isPresented: Binding(
            get: { regressionTarget != nil },
            set: { if !$0 { regressionTarget = nil } }
        ), presenting: regressionTarget) { target in
            Button("I started over") { log(target) }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            if let current = state.currentProgress {
                Text("This is earlier than your current progress (\(Formatting.progress(current))). What's happening?")
            }
        }
    }

    private func row(_ episode: TMDBEpisode) -> some View {
        let isCurrent = state.currentProgress?.season == season && state.currentProgress?.episode == episode.episodeNumber
        return HStack(alignment: .top, spacing: 12) {
            PosterImage(url: TMDBImage.stillURL(episode.stillPath), width: 112, aspectRatio: 16.0 / 9.0, cornerRadius: 8)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text("\(episode.episodeNumber). \(episode.name)")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(isCurrent ? Color.accentColor : .primary)
                        .lineLimit(2)
                    if isCurrent {
                        Text("CURRENT")
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 4))
                            .foregroundStyle(.white)
                    }
                }
                if let overview = episode.overview, !overview.isEmpty {
                    Text(overview)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Button("Log Episode") { tap(episode.episodeNumber) }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .disabled(isLogging)
            }
        }
        .listRowBackground(isCurrent ? Color.accentColor.opacity(0.08) : nil)
    }

    private func load() async {
        episodes = nil
        loadFailed = false
        do {
            episodes = try await services.tmdb.season(tmdbId: state.show.tmdbId, season: season).episodes
        } catch is CancellationError {
        } catch {
            loadFailed = true
        }
    }

    private func tap(_ episodeNumber: Int) {
        let target = EpisodeRef(season: season, episode: episodeNumber)
        if ProgressLogic.isRegression(season: target.season, episode: target.episode, current: state.currentProgress) {
            regressionTarget = target
        } else {
            log(target)
        }
    }

    private func log(_ target: EpisodeRef) {
        isLogging = true
        Task {
            await EpisodeLogger.log(state, target, library: library, toasts: services.toasts)
            isLogging = false
            onLogged()
        }
    }
}
