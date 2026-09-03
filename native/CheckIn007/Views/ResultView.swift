import SwiftUI

/// The assignment result screen. Announces the guest's table (or a pending message), notes a repeat
/// visit, and returns to the roster after `Timing.resultMs` (4000 ms under Reduce Motion).
struct ResultView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let guest: Guest
    let repeatVisit: Bool
    var onDismiss: () -> Void

    private var tableText: String {
        guest.table.isEmpty ? "PROCEED TO THE CHECK-IN DESK" : guest.table
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            VStack(spacing: Theme.Spacing.loose) {
                Text(displayName)
                    .font(Theme.Typography.title)
                    .foregroundStyle(Theme.primaryText)
                    .multilineTextAlignment(.center)
                Text(tableText)
                    .font(Theme.Typography.heading)
                    .foregroundStyle(Theme.accent)
                    .multilineTextAlignment(.center)
                if repeatVisit {
                    Text("AGENT ALREADY ON RECORD")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.secondaryText)
                }
            }
            .padding(Theme.Spacing.loose)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                "\(displayName), \(tableText)\(repeatVisit ? ", already on record" : "")"
            )
            .accessibilityIdentifier(A11y.resultTitle)
        }
        .task {
            let millis = Timing.result(reduceMotion: reduceMotion)
            try? await Task.sleep(for: .milliseconds(millis))
            onDismiss()
        }
    }

    private var displayName: String {
        guest.name.trimmingCharacters(in: .whitespaces).isEmpty ? "UNKNOWN AGENT" : guest.name
    }
}
