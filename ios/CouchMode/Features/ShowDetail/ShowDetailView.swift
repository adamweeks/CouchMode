import CouchModeCore
import CouchModeData
import SwiftUI
import UIKit

/// A show's detail screen, for shows in the library and TMDB results alike.
/// Port of the web app's ShowDetailPage.
struct ShowDetailView: View {
    let route: ShowRoute

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @Environment(\.dismiss) private var dismiss

    @State private var details: TMDBShowDetails? = nil
    @State private var detailsError: String? = nil
    @State private var currentEpisode: TMDBEpisode? = nil
    @State private var nextEpisode: TMDBEpisode? = nil

    @State private var isLogSheetPresented = false
    @State private var isFinishSheetPresented = false
    @State private var isServiceSheetPresented = false
    @State private var browseSeason: BrowseSeason? = nil
    @State private var confirmReset = false
    @State private var confirmRemove = false
    @State private var isWorking = false
    @State private var addService = ""

    private var state: ShowState? { library.state(forTMDBId: String(route.tmdbId)) }

    /// Reloads episode info when the show enters the library or progress moves.
    private var episodeTaskKey: String {
        "\(state?.id ?? "-")/\(state?.currentProgress.map { EpisodeRef($0).key } ?? "-")/\(state?.nextEpisode?.key ?? "-")"
    }

    private var title: String { details?.name ?? state?.show.title ?? route.preview?.name ?? "" }

    var body: some View {
        List {
            headerSection

            if let state, let current = state.currentProgress, let currentEpisode {
                lastWatchedSection(current: EpisodeRef(current), episode: currentEpisode)
            }

            if let state, state.activeRewatch != nil, let next = state.nextEpisode {
                upNextSection(state: state, next: next)
            }

            if let overview = details?.overview, !overview.isEmpty {
                Section("Overview") {
                    Text(overview)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if let seasons = details?.regularSeasons, !seasons.isEmpty {
                seasonsSection(seasons)
            }

            if let providers = state?.show.streamingProviders, !providers.isEmpty {
                providersSection(providers)
            }

            if let state, !state.completedRewatches.isEmpty {
                statsSection(state)
                historySection(state)
            }

            actionSection

            Section {
                TMDBAttribution()
            }
            .listRowBackground(Color.clear)
        }
        .listStyle(.insetGrouped)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if details == nil, state == nil, detailsError == nil {
                ProgressView()
            }
        }
        .task(id: route.tmdbId) { await loadDetails() }
        .task(id: episodeTaskKey) { await loadEpisodes() }
        .refreshable {
            await library.load()
            await loadDetails()
        }
        .sheet(isPresented: $isLogSheetPresented) {
            if let state { LogEpisodeSheet(state: state) }
        }
        .sheet(isPresented: $isFinishSheetPresented) {
            if let state { MarkFinishedSheet(state: state) }
        }
        .sheet(isPresented: $isServiceSheetPresented) {
            if let state { EditServiceSheet(state: state) }
        }
        .sheet(item: $browseSeason) { browse in
            if let details {
                BrowseEpisodesSheet(tmdbId: String(route.tmdbId), title: title,
                                    seasons: details.regularSeasons, initialSeason: browse.number)
            }
        }
    }

    // MARK: - Sections

    private var headerSection: some View {
        Section {
            HStack(alignment: .top, spacing: 14) {
                PosterImage(
                    url: TMDBImage.posterURL(details?.posterPath ?? route.preview?.posterPath)
                        ?? TMDBImage.storedPosterURL(state?.show.posterUrl),
                    width: 84,
                    cornerRadius: 8
                )
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.title3.bold())
                    if let meta = metaLine {
                        Text(meta).font(.caption).foregroundStyle(.secondary)
                    }
                    if let seasons = details?.regularSeasons, !seasons.isEmpty {
                        let episodes = seasons.reduce(0) { $0 + $1.episodeCount }
                        Text("\(seasons.count) season\(seasons.count == 1 ? "" : "s") · \(episodes) episodes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let state {
                        if let current = state.currentProgress {
                            (Text(Formatting.progress(current)).foregroundStyle(Color.accentColor).bold()
                                + Text(currentEpisode.map { " · \($0.name)" } ?? "").foregroundStyle(.secondary))
                                .font(.subheadline)
                                .padding(.top, 2)
                        } else {
                            let completed = state.completedRewatches.count
                            Text(completed > 0 ? "Completed \(completed) time\(completed == 1 ? "" : "s")" : "Not started")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.top, 2)
                        }
                    }
                }
            }
            .padding(.vertical, 4)

            if let state, state.isWatching, state.show.totalEpisodes > 0 {
                VStack(spacing: 6) {
                    HStack {
                        Text("Series progress")
                        Spacer()
                        Text("Ep \(state.watchedEpisodes) of \(state.show.totalEpisodes) · \(state.percentComplete)%")
                    }
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    ProgressTrack(fraction: Double(state.percentComplete) / 100, height: 4)
                }
                .padding(.vertical, 4)
            }

            if let detailsError, details == nil {
                Label(detailsError, systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var metaLine: String? {
        var parts: [String] = []
        if let year = Formatting.year(details?.firstAirDate ?? route.preview?.firstAirDate) { parts.append(year) }
        if let genres = details?.genres?.prefix(2).map(\.name), !genres.isEmpty { parts.append(genres.joined(separator: " · ")) }
        if let details { parts.append(details.hasEnded ? "Ended" : "Ongoing") }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private func lastWatchedSection(current: EpisodeRef, episode: TMDBEpisode) -> some View {
        Section {
            if episode.stillPath != nil {
                StillImage(url: TMDBImage.stillURL(episode.stillPath))
                    .listRowInsets(EdgeInsets())
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("\(Formatting.progress(current)) · \(episode.name)")
                    .font(.subheadline.bold())
                if let overview = episode.overview, !overview.isEmpty {
                    Text(overview)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        } header: {
            Label("Last Watched", systemImage: "eye")
        }
    }

    private func upNextSection(state: ShowState, next: EpisodeRef) -> some View {
        Section {
            if nextEpisode?.stillPath != nil {
                StillImage(url: TMDBImage.stillURL(nextEpisode?.stillPath))
                    .listRowInsets(EdgeInsets())
            }
            VStack(alignment: .leading, spacing: 6) {
                (Text(Formatting.progress(next)).bold()
                    + Text(nextEpisode.map { " · \($0.name)" } ?? "").foregroundStyle(.secondary))
                    .font(.subheadline)
                if let airLine = Formatting.episodeAirDate(nextEpisode?.airDate) {
                    Label(airLine, systemImage: "calendar")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(ProgressLogic.isUnaired(nextEpisode?.airDate) ? Color.orange : Color.secondary)
                }
                if let overview = nextEpisode?.overview, !overview.isEmpty {
                    Text(overview)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
                Button {
                    Task {
                        isWorking = true
                        await EpisodeLogger.log(state, next, library: library, toasts: services.toasts)
                        isWorking = false
                    }
                } label: {
                    Label("Log \(Formatting.progress(next))", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(isWorking)
                .padding(.top, 4)
            }

            HStack(spacing: 10) {
                Button {
                    isLogSheetPresented = true
                } label: {
                    Label("Pick Episode", systemImage: "list.bullet").frame(maxWidth: .infinity)
                }
                Button {
                    isFinishSheetPresented = true
                } label: {
                    Label("Finished", systemImage: "checkmark.circle").frame(maxWidth: .infinity)
                }
                .tint(.green)
            }
            .buttonStyle(.bordered)

            Button {
                isServiceSheetPresented = true
            } label: {
                LabeledContent {
                    Text(state.activeRewatch?.service ?? "Not set")
                } label: {
                    Label("Watching on", systemImage: "tv")
                }
            }
            .foregroundStyle(.primary)

            if state.currentProgress != nil {
                Button(role: .destructive) {
                    confirmReset = true
                } label: {
                    Label("Undo Rewatch (Reset Progress)", systemImage: "arrow.uturn.backward")
                }
                .disabled(isWorking)
                .confirmationDialog("Undo this rewatch?", isPresented: $confirmReset, titleVisibility: .visible) {
                    Button("Undo Rewatch", role: .destructive) {
                        Task {
                            do {
                                try await library.resetRewatch(state)
                                services.toasts.show("Rewatch reset", duration: 2)
                            } catch {
                                services.toasts.error(error)
                            }
                        }
                    }
                } message: {
                    let n = state.watchedEpisodes
                    Text("This clears the \(n) episode\(n == 1 ? "" : "s") logged in your current rewatch of \(state.show.title). Your completed rewatch history is kept.")
                }
            }
        } header: {
            Label("Up Next", systemImage: "forward.end")
        }
    }

    private func seasonsSection(_ seasons: [TMDBSeason]) -> some View {
        Section("Seasons") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(seasons, id: \.seasonNumber) { season in
                        Button {
                            browseSeason = BrowseSeason(number: season.seasonNumber)
                        } label: {
                            HStack(spacing: 4) {
                                Text("S\(season.seasonNumber)").bold()
                                Text("\(season.episodeCount) ep\(season.episodeCount == 1 ? "" : "s")")
                                    .foregroundStyle(.secondary)
                            }
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func providersSection(_ providers: [WatchProvider]) -> some View {
        Section("Available On") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(providers) { provider in
                        VStack(spacing: 4) {
                            AsyncImage(url: TMDBImage.providerLogoURL(provider.logoPath)) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Color(.tertiarySystemFill)
                            }
                            .frame(width: 44, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            Text(provider.providerName)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                                .frame(width: 60)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
    }

    private func statsSection(_ state: ShowState) -> some View {
        Section("Stats") {
            HStack(spacing: 12) {
                StatCard(value: "\(state.completedRewatches.count)", label: "Rewatches")
                if let avg = state.averageDaysBetweenRewatches {
                    StatCard(value: "\(avg)d", label: "Avg between rewatches")
                }
            }
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        }
    }

    private func historySection(_ state: ShowState) -> some View {
        Section("Rewatch History") {
            ForEach(Array(state.completedRewatches.enumerated()), id: \.element.id) { index, rewatch in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Rewatch #\(state.completedRewatches.count - index)")
                            .font(.subheadline.weight(.semibold))
                        if let completed = rewatch.completedAt {
                            Text(
                                [Formatting.duration(from: rewatch.startedAt, to: completed), rewatch.service]
                                    .compactMap { $0 }
                                    .joined(separator: " · ")
                            )
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        if let note = rewatch.note, !note.isEmpty {
                            Text("“\(note)”").font(.caption).italic()
                        }
                    }
                    Spacer()
                    if let completed = rewatch.completedAt {
                        Text(Formatting.monthYear(completed))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var actionSection: some View {
        if let state {
            Section {
                Button("Remove from Rotation", role: .destructive) { confirmRemove = true }
                    .frame(maxWidth: .infinity)
                    .confirmationDialog("Remove \(state.show.title)?", isPresented: $confirmRemove, titleVisibility: .visible) {
                        Button("Remove", role: .destructive) {
                            Task {
                                do {
                                    try await library.removeShow(state.show)
                                    dismiss()
                                } catch {
                                    services.toasts.error(error)
                                }
                            }
                        }
                    } message: {
                        Text("All rewatch history will be permanently deleted.")
                    }
            }
        } else if library.hasLoaded {
            Section {
                ServicePicker(title: "Watching on", service: $addService,
                              availableOn: [])
                Button {
                    Task { await addToRotation() }
                } label: {
                    HStack {
                        Spacer()
                        if isWorking { ProgressView() } else { Text("Add to Rotation").bold() }
                        Spacer()
                    }
                }
                .disabled(isWorking || (details == nil && route.preview == nil))
            } footer: {
                Text("Adds the show to Up Next so you can start a rewatch.")
            }
        }
    }

    // MARK: - Loading & actions

    private func loadDetails() async {
        do {
            details = try await services.tmdb.details(tmdbId: route.tmdbId)
            detailsError = nil
        } catch is CancellationError {
        } catch {
            detailsError = "Couldn't load show details from TMDB."
        }
    }

    private func loadEpisodes() async {
        guard let state else {
            currentEpisode = nil
            nextEpisode = nil
            return
        }
        let tmdbId = state.show.tmdbId
        if let current = state.currentProgress {
            currentEpisode = await SeasonLoader.episode(tmdbId: tmdbId, season: current.season,
                                                        episode: current.episode, services: services)
        } else {
            currentEpisode = nil
        }
        if let next = state.nextEpisode {
            nextEpisode = await SeasonLoader.episode(tmdbId: tmdbId, season: next.season,
                                                     episode: next.episode, services: services)
        } else {
            nextEpisode = nil
        }
    }

    private func addToRotation() async {
        guard let result = details?.asSearchResult ?? route.preview else { return }
        isWorking = true
        defer { isWorking = false }
        do {
            try await library.addShow(result, service: addService.isEmpty ? nil : addService)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            services.toasts.show("Added \(result.name) to Up Next")
        } catch {
            services.toasts.error(error)
        }
    }
}

struct BrowseSeason: Identifiable {
    var number: Int
    var id: Int { number }
}
