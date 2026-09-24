import Foundation
import Observation

/// A single transient message at the bottom of the screen, optionally with an
/// action (e.g. Undo). The native stand-in for the web app's Ionic toasts.
@MainActor
@Observable
public final class ToastCenter {
    public struct Toast: Identifiable {
        public enum Style { case info, success, error }

        public let id = UUID()
        public var message: String
        public var style: Style
        public var actionTitle: String?
        public var action: (@MainActor () -> Void)?
    }

    public private(set) var current: Toast?
    @ObservationIgnored private var dismissTask: Task<Void, Never>?

    public init() {}

    public func show(
        _ message: String,
        style: Toast.Style = .info,
        duration: TimeInterval = 3,
        actionTitle: String? = nil,
        action: (@MainActor () -> Void)? = nil
    ) {
        let toast = Toast(message: message, style: style, actionTitle: actionTitle, action: action)
        current = toast
        dismissTask?.cancel()
        dismissTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            guard !Task.isCancelled, self?.current?.id == toast.id else { return }
            self?.current = nil
        }
    }

    public func error(_ error: Error) {
        show(error.localizedDescription, style: .error)
    }

    public func dismiss() {
        dismissTask?.cancel()
        current = nil
    }

    /// Runs the toast's action and dismisses it.
    public func performAction() {
        let action = current?.action
        dismiss()
        action?()
    }
}
