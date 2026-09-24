import SwiftUI

/// A TMDB poster (2:3) or still (16:9) with a neutral placeholder.
struct PosterImage: View {
    var url: URL?
    var width: CGFloat = 44
    var aspectRatio: CGFloat = 2.0 / 3.0
    var cornerRadius: CGFloat = 6

    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeIn(duration: 0.15))) { phase in
            switch phase {
            case let .success(image):
                image.resizable().scaledToFill()
            default:
                ZStack {
                    Rectangle().fill(.quaternary)
                    Image(systemName: "tv")
                        .font(.system(size: width * 0.3))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .frame(width: width, height: width / aspectRatio)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// Full-width 16:9 episode still.
struct StillImage: View {
    var url: URL?

    var body: some View {
        Color.clear
            .aspectRatio(16.0 / 9.0, contentMode: .fit)
            .overlay {
                AsyncImage(url: url) { phase in
                    if case let .success(image) = phase {
                        image.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(.quaternary)
                    }
                }
            }
            .clipped()
            .accessibilityHidden(true)
    }
}
