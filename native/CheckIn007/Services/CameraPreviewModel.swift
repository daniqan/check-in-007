import AVFoundation
import Foundation

/// Camera authorization and session lifecycle for the theatrical scan preview.
///
/// The capture session is intentionally **preview-only**: a single video device input and no
/// outputs, no audio input, and no frame-processing delegate — the app never captures, stores,
/// transmits, or processes frames. On denial/restriction/unavailability the app falls back to
/// "covert mode" and the check-in flow continues.
///
/// Note: this uses `ObservableObject` (rather than the `@Observable` macro used by `AppModel`) on
/// purpose — it is bridged into SwiftUI through a `UIViewRepresentable` (`CameraPreviewView`), where
/// an `@ObservedObject` reference to a reference-type session owner is the established pattern.
@MainActor
final class CameraPreviewModel: ObservableObject {
    enum State: Equatable {
        case idle
        case requestingPermission
        case running
        case denied
        case unavailable
        case failed(String)
    }

    @Published private(set) var state: State = .idle
    let session = AVCaptureSession()

    private var isConfigured = false

    /// Map an authorization status to a session state (covert fallbacks for denied/restricted).
    static func mapAuthorization(_ status: AVAuthorizationStatus) -> State {
        switch status {
        case .authorized: return .running
        case .notDetermined: return .requestingPermission
        case .denied: return .denied
        case .restricted: return .denied
        @unknown default: return .unavailable
        }
    }

    /// Request `.video` authorization (only when scan starts) and, if granted, configure and run a
    /// preview-only session. Never requests microphone permission.
    func start() async {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            configureAndRun()
        case .notDetermined:
            state = .requestingPermission
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            granted ? configureAndRun() : (state = .denied)
        case .denied, .restricted:
            state = .denied
        @unknown default:
            state = .unavailable
        }
    }

    /// Stop the session and all capture work when leaving scan.
    func stop() {
        if session.isRunning {
            session.stopRunning()
        }
    }

    /// Add the video input only. No audio input, no photo/movie/video-data outputs are ever added,
    /// preserving the privacy boundary. Returns the resulting state.
    @discardableResult
    func configureSessionInputs() -> State {
        guard !isConfigured else { return state }
        guard let device = AVCaptureDevice.default(for: .video),
            let input = try? AVCaptureDeviceInput(device: device)
        else {
            state = .unavailable
            return state
        }

        session.beginConfiguration()
        if session.canAddInput(input) {
            session.addInput(input)
            isConfigured = true
            state = .idle
        } else {
            state = .failed("Could not add camera input.")
        }
        session.commitConfiguration()
        return state
    }

    /// True iff the session carries no audio inputs and no outputs — the invariant asserted by
    /// `CameraPrivacyTests`.
    var isPreviewOnly: Bool {
        let hasAudioInput = session.inputs.contains { input in
            (input as? AVCaptureDeviceInput)?.device.hasMediaType(.audio) == true
        }
        return session.outputs.isEmpty && !hasAudioInput
    }

    private func configureAndRun() {
        let result = configureSessionInputs()
        guard result == .idle || result == .running else { return }
        if !session.isRunning {
            session.startRunning()
        }
        state = .running
    }
}
