import CouchModeCore
import CouchModeData
import SwiftUI

/// Account, appearance, and home-screen options. Port of the web app's
/// SettingsPage. Home-screen options sync with the web app via
/// `user_preferences`.
struct SettingsView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(PreferencesStore.self) private var preferences
    @Environment(AppServices.self) private var services
    @AppStorage(AppTheme.storageKey) private var theme: AppTheme = .system
    @State private var confirmSignOut = false

    var body: some View {
        Form {
            if let user = auth.user {
                Section {
                    HStack(spacing: 14) {
                        avatar(for: user)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(user.displayName).font(.headline)
                            if let email = user.email, email != user.displayName {
                                Text(email).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section {
                Picker(selection: $theme) {
                    ForEach(AppTheme.allCases) { Text($0.label).tag($0) }
                } label: {
                    Label("Theme", systemImage: "moon")
                }
            }

            Section {
                Toggle(isOn: binding(\.showResumeCard)) {
                    Label("Continue Watching card", systemImage: "play.circle")
                }
                Picker(selection: binding(\.resumeCardMode)) {
                    Text("Up next").tag(ResumeCardMode.upNext)
                    Text("Last watched").tag(ResumeCardMode.lastWatched)
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("That card shows")
                        Text("Highlight the next episode or the last one you watched")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .disabled(!preferences.preferences.showResumeCard)
                Toggle(isOn: binding(\.showDoneSection)) {
                    Label("Show finished shows", systemImage: "checkmark.circle")
                }
            } header: {
                Text("Home Screen")
            } footer: {
                Text("These options sync across your devices.")
            }

            Section {
                LabeledContent("Version", value: Self.version)
                Link(destination: URL(string: "https://www.themoviedb.org")!) {
                    Label("The Movie Database (TMDB)", systemImage: "film")
                }
            } footer: {
                TMDBAttribution().padding(.top, 4)
            }

            Section {
                Button("Sign Out", role: .destructive) { confirmSignOut = true }
                    .frame(maxWidth: .infinity)
            }
        }
        .navigationTitle("Settings")
        .confirmationDialog("Sign out of CouchMode?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Sign Out", role: .destructive) {
                Task {
                    do { try await auth.signOut() } catch { services.toasts.error(error) }
                }
            }
        }
    }

    private func binding<Value>(_ keyPath: WritableKeyPath<Preferences, Value>) -> Binding<Value> {
        Binding(
            get: { preferences.preferences[keyPath: keyPath] },
            set: { newValue in preferences.update { $0[keyPath: keyPath] = newValue } }
        )
    }

    @ViewBuilder
    private func avatar(for user: AppUser) -> some View {
        let initial = Text(String(user.displayName.prefix(1)).uppercased())
            .font(.title2.bold())
            .foregroundStyle(.white)
            .frame(width: 56, height: 56)
            .background(
                LinearGradient(colors: [Color(red: 0.22, green: 0.5, blue: 1), Color(red: 0.32, green: 0.38, blue: 1)],
                               startPoint: .topLeading, endPoint: .bottomTrailing),
                in: Circle()
            )
        if let url = user.avatarURL {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill().frame(width: 56, height: 56).clipShape(Circle())
            } placeholder: {
                initial
            }
        } else {
            initial
        }
    }

    static var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }
}
