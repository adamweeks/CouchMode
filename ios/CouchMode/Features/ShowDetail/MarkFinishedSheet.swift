import CouchModeCore
import CouchModeData
import SwiftUI
import UIKit

/// "Finished it!" — completes the current rewatch with dates, service, and a
/// note, then starts a fresh rewatch. Port of the web app's MarkFinishedModal.
struct MarkFinishedSheet: View {
    let state: ShowState

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @Environment(\.dismiss) private var dismiss

    @State private var includeStart = true
    @State private var startDate = Date()
    @State private var endDate = Date()
    @State private var service = ""
    @State private var note = ""
    @State private var isSaving = false
    @State private var errorMessage: String? = nil

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("I know when I started", isOn: $includeStart)
                    if includeStart {
                        DatePicker("Started", selection: $startDate, in: ...endDate, displayedComponents: .date)
                    }
                    DatePicker("Finished", selection: $endDate, in: ...Date(), displayedComponents: .date)
                }

                Section {
                    ServicePicker(title: "Watched on", service: $service, availableOn: providerNames)
                }

                Section("Note") {
                    TextField("Any thoughts on this rewatch?", text: $note, axis: .vertical)
                        .lineLimit(2...5)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Finished it!")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(isSaving)
                }
            }
            .onAppear {
                startDate = state.activeRewatch?.startedAt ?? Date()
                service = state.activeRewatch?.service ?? ""
            }
        }
        .presentationDetents([.large])
    }

    private var providerNames: [String] {
        state.show.streamingProviders?.map(\.providerName) ?? []
    }

    private func save() async {
        errorMessage = nil
        if includeStart, Calendar.current.startOfDay(for: startDate) > Calendar.current.startOfDay(for: endDate) {
            errorMessage = "Start date must be before finish date"
            return
        }
        isSaving = true
        defer { isSaving = false }
        do {
            try await library.markFinished(
                state,
                startedAt: includeStart ? Self.utcNoon(of: startDate) : nil,
                completedAt: Self.utcNoon(of: endDate),
                note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note,
                service: service.isEmpty ? nil : service
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            services.toasts.show("\(state.show.title) finished! 🎉", style: .success)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// The web app stores picked dates as noon UTC so they read as the same
    /// calendar day in every timezone.
    static func utcNoon(of date: Date) -> Date {
        let day = Calendar.current.dateComponents([.year, .month, .day], from: date)
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        return utc.date(from: DateComponents(year: day.year, month: day.month, day: day.day, hour: 12)) ?? date
    }
}

/// Changes which service the current rewatch is on.
struct EditServiceSheet: View {
    let state: ShowState

    @Environment(LibraryStore.self) private var library
    @Environment(AppServices.self) private var services
    @Environment(\.dismiss) private var dismiss
    @State private var service = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                ServicePicker(title: "Watching on", service: $service,
                              availableOn: state.show.streamingProviders?.map(\.providerName) ?? [])
            }
            .navigationTitle("Streaming Service")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        isSaving = true
                        Task {
                            do {
                                try await library.updateService(state, service: service.isEmpty ? nil : service)
                                dismiss()
                            } catch {
                                services.toasts.error(error)
                            }
                            isSaving = false
                        }
                    }
                    .disabled(isSaving)
                }
            }
            .onAppear { service = state.activeRewatch?.service ?? "" }
        }
        .presentationDetents([.medium])
    }
}
