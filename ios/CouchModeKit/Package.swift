// swift-tools-version: 5.10
import PackageDescription

// CouchModeKit holds everything in the iOS app that isn't a SwiftUI view:
//
// - CouchModeCore — pure Foundation: models, progress logic, grouping, stats.
//   A direct port of the web app's src/lib/progressLogic.ts + hook logic.
// - CouchModeData — Supabase-backed repositories and @Observable stores.
//
// Both targets build on Linux too, so `swift test` runs in CI without Xcode.
let package = Package(
    name: "CouchModeKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "CouchModeCore", targets: ["CouchModeCore"]),
        .library(name: "CouchModeData", targets: ["CouchModeData"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.24.0"),
    ],
    targets: [
        .target(name: "CouchModeCore"),
        .target(
            name: "CouchModeData",
            dependencies: [
                "CouchModeCore",
                .product(name: "Supabase", package: "supabase-swift"),
            ]
        ),
        .testTarget(name: "CouchModeCoreTests", dependencies: ["CouchModeCore"]),
    ]
)
