import CouchModeData
import SwiftUI

/// Renders ToastCenter's current toast above the tab bar.
private struct ToastOverlayModifier: ViewModifier {
    @Environment(ToastCenter.self) private var toasts

    func body(content: Content) -> some View {
        content.overlay(alignment: .bottom) {
            if let toast = toasts.current {
                HStack(spacing: 12) {
                    Image(systemName: icon(for: toast.style))
                        .foregroundStyle(tint(for: toast.style))
                    Text(toast.message)
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if let title = toast.actionTitle {
                        Button(title) { toasts.performAction() }
                            .font(.subheadline.bold())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
                .padding(.horizontal, 16)
                .padding(.bottom, 64) // clear the tab bar
                .id(toast.id)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .onTapGesture { toasts.dismiss() }
                .accessibilityElement(children: .combine)
                .accessibilityAddTraits(.isStaticText)
            }
        }
        .animation(.spring(duration: 0.3), value: toasts.current?.id)
    }

    private func icon(for style: ToastCenter.Toast.Style) -> String {
        switch style {
        case .info: "checkmark.circle.fill"
        case .success: "party.popper.fill"
        case .error: "exclamationmark.triangle.fill"
        }
    }

    private func tint(for style: ToastCenter.Toast.Style) -> Color {
        switch style {
        case .info: .accentColor
        case .success: .green
        case .error: .red
        }
    }
}

extension View {
    func toastOverlay() -> some View {
        modifier(ToastOverlayModifier())
    }
}
