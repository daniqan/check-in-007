import SwiftUI

/// The opening beat: the event-operations identity, shown for `Timing.loadingMs` (900 ms under
/// Reduce Motion) before advancing to the roster.
struct LoadingView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var onComplete: () -> Void

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            VStack(spacing: Theme.Spacing.regular) {
                Text("CHECK-IN 007")
                    .font(Theme.Typography.title)
                    .foregroundStyle(Theme.accent)
                Text("EVENT OPERATIONS")
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.secondaryText)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Check-In 007, event operations")
        }
        .task {
            let millis = Timing.loading(reduceMotion: reduceMotion)
            try? await Task.sleep(for: .milliseconds(millis))
            onComplete()
        }
    }
}
