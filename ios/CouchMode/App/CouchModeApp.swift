import CouchModeData
import SwiftUI

@main
struct CouchModeApp: App {
    @State private var services: AppServices? = nil
    @State private var configError: String? = nil
    @AppStorage(AppTheme.storageKey) private var theme: AppTheme = .system

    init() {
        // Posters and stills are loaded through URLSession; give them room to cache.
        URLCache.shared = URLCache(memoryCapacity: 50 * 1024 * 1024, diskCapacity: 300 * 1024 * 1024)

        do {
            _services = State(initialValue: AppServices(backend: Backend(config: try BackendConfig.fromBundle())))
        } catch {
            _configError = State(initialValue: error.localizedDescription)
        }
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if let services {
                    RootView()
                        .environment(services)
                        .environment(services.auth)
                        .environment(services.toasts)
                        .onOpenURL { services.auth.handle($0) }
                } else {
                    ContentUnavailableView(
                        "CouchMode isn't configured",
                        systemImage: "gearshape.2",
                        description: Text(configError ?? "")
                    )
                }
            }
            .preferredColorScheme(theme.colorScheme)
            .tint(.accentColor)
        }
    }
}
