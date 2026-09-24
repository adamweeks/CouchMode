import CouchModeCore
import CouchModeData
import SwiftUI

/// Completed rewatches and lifetime stats. Port of the web app's HistoryPage.
struct HistoryView: View {
    @Environment(LibraryStore.self) private var library

    var body: some View {
        let stats = library.history

        List {
            if stats.totalRewatches > 0 {
                Section("Your Stats") {
                    Grid(horizontalSpacing: 10, verticalSpacing: 10) {
                        GridRow {
                            StatCard(value: "\(stats.totalRewatches)", label: "Total Rewatches")
                            StatCard(value: "\(stats.showsRewatched)", label: "Shows Rewatched")
                        }
                        GridRow {
                            StatCard(value: stats.episodesWatched.formatted(), label: "Episodes Watched")
                            StatCard(value: "\(stats.estimatedHours.formatted())h", label: "Est. Hours")
                        }
                        GridRow {
                            StatCard(value: averageLabel(stats.averageDaysPerRewatch), label: "Avg. Days / Rewatch")
                            StatCard(value: "\(stats.rewatchesThisYear)", label: "In \(String(stats.currentYear))")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)

                    if let most = stats.mostRewatched {
                        NavigationLink(value: ShowRoute(show: most.show)) {
                            HStack(spacing: 12) {
                                PosterImage(url: TMDBImage.storedPosterURL(most.show.posterUrl), width: 40)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Most Rewatched")
                                        .font(.caption2)
                                        .textCase(.uppercase)
                                        .foregroundStyle(.secondary)
                                    Text(most.show.title).font(.headline)
                                    Text("watched \(most.count)×")
                                        .font(.caption)
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                        }
                    }
                }

                ForEach(stats.years) { group in
                    Section(String(group.year)) {
                        ForEach(group.entries) { entry in
                            NavigationLink(value: ShowRoute(show: entry.show)) {
                                HStack(spacing: 12) {
                                    PosterImage(url: TMDBImage.storedPosterURL(entry.show.posterUrl), width: 40)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(entry.show.title).font(.subheadline.weight(.semibold))
                                        Text("Completed \(Formatting.monthYear(entry.completedAt))")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if !library.hasLoaded {
                ProgressView()
            } else if stats.totalRewatches == 0 {
                ContentUnavailableView("No completed rewatches yet", systemImage: "book",
                                       description: Text("Finish a show and it'll show up here."))
            }
        }
        .navigationTitle("History")
        .refreshable { await library.load() }
        .showDetailDestination()
    }

    private func averageLabel(_ days: Int?) -> String {
        guard let days else { return "—" }
        return days == 0 ? "<1" : "\(days)"
    }
}
