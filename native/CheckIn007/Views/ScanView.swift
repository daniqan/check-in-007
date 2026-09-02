import SwiftUI

/// The scan screen: starts the camera preview on entry, falls back to covert mode on
/// denial/unavailability, and advances after `Timing.scanMs` (2500 ms under Reduce Motion). No
/// frames are captured or processed — the preview is purely theatrical.
struct ScanView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ObservedObject var camera: CameraPreviewModel
    let guest: Guest
    var onComplete: () -> Void

    private var isCovert: Bool {
        switch camera.state {
        case .denied, .unavailable, .failed:
            return true
        default:
            return false
        }
    }

    private var statusText: String {
        isCovert ? "COVERT SCAN IN PROGRESS" : "SCANNING"
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            if !isCovert {
                CameraPreviewView(model: camera)
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
            }
            VStack {
                Spacer()
                Text(statusText)
                    .font(Theme.Typography.heading)
                    .foregroundStyle(Theme.accent)
                    .padding(Theme.Spacing.regular)
                    .accessibilityIdentifier(A11y.scanStatus)
                    .accessibilityLabel("\(statusText) for \(guest.name)")
                Spacer().frame(height: Theme.Spacing.loose)
            }
        }
        .task {
            await camera.start()
            let millis = Timing.scan(reduceMotion: reduceMotion)
            try? await Task.sleep(for: .milliseconds(millis))
            camera.stop()
            onComplete()
        }
        .onDisappear { camera.stop() }
    }
}
