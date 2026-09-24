import CouchModeCore
import SwiftUI

/// Picks where a rewatch was watched: the show's TMDB providers first, then
/// common services, physical/purchased options, or a custom name.
/// Port of the web app's ServiceSelector.
struct ServicePicker: View {
    var title: String = "Service"
    @Binding var service: String
    var availableOn: [String] = []

    @State private var isCustom = false
    private static let otherTag = "__other__"

    private var options: [String] { StreamingServices.options(availableOn: availableOn) }

    var body: some View {
        Picker(title, selection: selection) {
            Text("None").tag("")
            if !availableOn.isEmpty {
                Section("Available on") {
                    ForEach(availableOn, id: \.self) { Text($0).tag($0) }
                }
            }
            Section(availableOn.isEmpty ? "Services" : "Other services") {
                ForEach(options.filter { !availableOn.contains($0) }, id: \.self) { Text($0).tag($0) }
            }
            Text("Other…").tag(Self.otherTag)
        }
        .onAppear { isCustom = !service.isEmpty && !options.contains(service) }

        if isCustom {
            TextField("Service name", text: $service)
                .textInputAutocapitalization(.words)
        }
    }

    private var selection: Binding<String> {
        Binding(
            get: { isCustom ? Self.otherTag : service },
            set: { newValue in
                if newValue == Self.otherTag {
                    isCustom = true
                    service = ""
                } else {
                    isCustom = false
                    service = newValue
                }
            }
        )
    }
}
