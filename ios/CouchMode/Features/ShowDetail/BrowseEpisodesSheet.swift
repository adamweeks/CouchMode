import CouchModeCore
import CouchModeData
import SwiftUI

/// Read-only episode guide for any season. Port of BrowseEpisodesModal.
struct BrowseEpisodesSheet: View {
    let tmdbId: String
    let title: String
    let seasons: [TMDBSeason]
    let initialSeason: Int

    @Environment(AppServices.self) private var services
    @Environment(\.dismiss) private var dismiss
    @State private var season: Int
    @State private var episodes: [TMDBEpisode]? = nil
    @State private var loadFailed = false

    init(tmdbId: String, title: String, seasons: [TMDBSeason], initialSeason: Int) {
        self.tmdbId = tmdbId
        self.title = title
        self.seasons = seasons
        self.initialSeason = initialSeason
        _season = State(initialValue: initialSeason)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Season", selection: $season) {
                        ForEach(seasons, id: \.seasonNumber) { s in
                            Text("Season \(s.seasonNumber)").tag(s.seasonNumber)
                        }
                    }
                    .pickerStyle(.menu)
                }

                if let episodes {
                    Section {
                        ForEach(episodes) { episode in
                            VStack(alignment: .leading, spacing: 8) {
                                if episode.stillPath != nil {
                                    StillImage(url: TMDBImage.stillURL(episode.stillPath))
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                }
                                Text("\(episode.episodeNumber). \(episode.name)")
                                    .font(.subheadline.weight(.semibold))
                                if let air = Formatting.episodeAirDate(episode.airDate) {
                                    Label(air, systemImage: "calendar")
                                        .font(.caption)
                                        .foregroundStyle(ProgressLogic.isUnaired(episode.airDate) ? Color.orange : Color.secondary)
                                }
                                if let overview = episode.overview, !overview.isEmpty {
                                    Text(overview)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } else if loadFailed {
                    ContentUnavailableView("Couldn't load episodes", systemImage: "wifi.exclamationmark")
                }
            }
            .overlay {
                if episodes == nil, !loadFailed { ProgressView() }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task(id: season) {
                episodes = nil
                loadFailed = false
                do {
                    episodes = try await services.tmdb.season(tmdbId: tmdbId, season: season).episodes
                } catch is CancellationError {
                } catch {
                    loadFailed = true
                }
            }
        }
    }
}
