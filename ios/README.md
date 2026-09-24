# CouchMode for iOS

A native SwiftUI version of CouchMode. It talks to the **same Supabase backend**
as the web app (same tables, row-level security, and edge functions), so data
and home-screen preferences are shared between the web app and iOS.

## Layout

```
ios/
├── project.yml              XcodeGen spec → generates CouchMode.xcodeproj
├── Config/
│   ├── Base.xcconfig        defaults (committed)
│   └── Config.example.xcconfig  copy to Config.xcconfig (git-ignored)
├── CouchMode/               the SwiftUI app target
│   ├── App/                 entry point, root/tab navigation, AppServices
│   ├── Components/          posters, status line, service picker, toasts, logging
│   ├── Features/            Auth, Rotation (My Shows), Search, ShowDetail,
│   │                        History, Suggestions, Settings
│   └── Resources/           asset catalog (icon, accent colour)
└── CouchModeKit/            Swift package: everything that isn't a view
    ├── Sources/CouchModeCore   models, progress logic, grouping, stats (pure Foundation)
    ├── Sources/CouchModeData   Supabase repository + @Observable stores
    └── Tests/CouchModeCoreTests
```

`CouchModeCore` is a direct port of `src/lib/progressLogic.ts` and the grouping
and stats logic in `src/hooks/` and `src/pages/`. Its tests mirror
`src/lib/progressLogic.test.ts`, so **change both apps together** when that
logic changes.

| Web                             | iOS                                          |
| ------------------------------- | -------------------------------------------- |
| `src/lib/progressLogic.ts`      | `CouchModeCore/ProgressLogic.swift`, `Formatting.swift` |
| `useShowGroups`, `useResumeShow`| `CouchModeCore/Library.swift`                |
| `HistoryPage` stats             | `CouchModeCore/History.swift`                |
| `src/hooks/use*.ts` mutations   | `CouchModeData/LibraryRepository.swift`      |
| React Query cache               | `CouchModeData/LibraryStore.swift`           |
| `PreferencesContext`            | `CouchModeData/PreferencesStore.swift`       |
| `AuthContext`                   | `CouchModeData/AuthStore.swift`              |
| `src/lib/tmdb.ts`               | `CouchModeData/TMDBService.swift`            |

## Getting started

Requirements: a Mac with Xcode 16+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen
cd ios
cp Config/Config.example.xcconfig Config/Config.xcconfig   # then fill it in
xcodegen generate
open CouchMode.xcodeproj
```

In `Config.xcconfig`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same
values as the web app's `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Because
xcconfig treats `//` as a comment, write the URL as `https:/$()/xxxx.supabase.co`.
Set `DEVELOPMENT_TEAM` and `APP_BUNDLE_ID` to run on a device.

The `.xcodeproj` is generated, so don't commit it. Re-run `xcodegen generate`
after adding or removing files.

## Supabase setup for the native app

The database and edge functions need no changes. Auth needs a little setup
under **Authentication** in the Supabase dashboard:

1. **Redirect URL.** Add `couchmode://auth-callback` under *URL Configuration →
   Redirect URLs*. Google sign-in and email-confirmation links return here.
2. **Sign in with Apple.** Enable the *Apple* provider and add your app's bundle
   id under *Client IDs*. Native sign-in uses an ID token, so no secret key is
   needed for iOS. Also enable the *Sign in with Apple* capability for the App
   ID in the Apple Developer portal. The entitlement is already in `project.yml`.
3. **Google.** It already works for the web app, and the same provider handles
   iOS through the redirect URL above.

## Tests

The package builds and tests on macOS or Linux, with no simulator needed:

```bash
cd ios/CouchModeKit
swift test
```

CI (`.github/workflows/ios.yml`) runs these tests on Linux and builds the app
for the iOS Simulator on macOS whenever something under `ios/` changes.

## Feature parity

| Feature | Status |
| --- | --- |
| Email/password sign in & sign up | ✅ |
| Google sign in | ✅ (ASWebAuthenticationSession) |
| Sign in with Apple | ✅ new (App Store requires it when offering Google) |
| My Shows: Continue Watching, Watching, Caught Up, Up Next, Done | ✅ |
| +1 quick log, swipe to log, log actions, pick specific episode, undo | ✅ |
| Up Next drag-to-reorder, swipe to start/remove | ✅ |
| Library filter + TMDB search | ✅ |
| Show detail: progress, last watched / up next, air dates, providers, stats, history | ✅ |
| Mark finished, change service, undo rewatch, browse episodes | ✅ |
| Add show (with service) / remove show | ✅ |
| Stale TMDB metadata refresh (providers, air status, episode counts) | ✅ |
| History stats & year list | ✅ |
| AI suggestions | ✅ |
| Settings: theme, home-screen options (synced with web) | ✅ |
| Haptics | ✅ new |
| Admin portal | ➖ web only |

## Before submitting to the App Store

- [ ] **In-app account deletion** (App Review Guideline 5.1.1(v)). This needs a
      small `delete-account` edge function that uses the service role to delete
      the user. Rows cascade from `auth.users`. Then add a *Delete Account* button
      in Settings.
- [ ] Privacy policy URL, and the App Privacy "nutrition label" (email, viewing history).
- [ ] Screenshots. Set the version and build number (`MARKETING_VERSION` and
      `CURRENT_PROJECT_VERSION` in `project.yml`).
- [ ] TestFlight build: *Product → Archive* in Xcode, or fastlane in CI.

## Ideas that only make sense natively

- Push notifications when a Caught Up show airs a new episode. `air_status`
  already stores the next air date.
- A home-screen / Lock Screen widget for Continue Watching (WidgetKit).
- Live Activity or Siri Shortcut: "Log the next episode of …".
