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
    enum State: Equatable, Sendable {
        case idle
        case requestingPermission
        case running
        case denied
        case unavailable
        case failed(String)
    }

    @Published private(set) var state: State = .idle
    private let worker = SessionWorker()
    private let authorizationStatus: () -> AVAuthorizationStatus
    private let requestAccess: () async -> Bool

    var session: AVCaptureSession { worker.session }

    init(
        authorizationStatus: @escaping () -> AVAuthorizationStatus = {
            AVCaptureDevice.authorizationStatus(for: .video)
        },
        requestAccess: @escaping () async -> Bool = {
            await AVCaptureDevice.requestAccess(for: .video)
        }
    ) {
        self.authorizationStatus = authorizationStatus
        self.requestAccess = requestAccess
    }

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
        let status = authorizationStatus()
        switch status {
        case .authorized:
            state = await worker.configureAndRun()
        case .notDetermined:
            state = .requestingPermission
            let granted = await requestAccess()
            state = granted ? await worker.configureAndRun() : .denied
        case .denied, .restricted:
            state = .denied
        @unknown default:
            state = .unavailable
        }
    }

    /// Stop the session and all capture work when leaving scan.
    func stop() {
        worker.stop()
        if state == .running { state = .idle }
    }

    /// Add the video input only. No audio input, no photo/movie/video-data outputs are ever added,
    /// preserving the privacy boundary. Returns the resulting state.
    @discardableResult
    func configureSessionInputs() -> State {
        state = worker.configureSessionInputs()
        return state
    }

    /// True iff the session carries no audio inputs and no outputs — the invariant asserted by
    /// `CameraPrivacyTests`.
    var isPreviewOnly: Bool {
        worker.isPreviewOnly
    }
}

/// Owns every potentially blocking AVCaptureSession operation on one serial queue. The wrapper is
/// explicitly sendable because that queue is the sole executor for its mutable configuration state.
private final class SessionWorker: @unchecked Sendable {
    let session = AVCaptureSession()

    private let queue = DispatchQueue(label: "com.checkin007.camera-session")
    private var isConfigured = false

    func configureAndRun() async -> CameraPreviewModel.State {
        await withCheckedContinuation { continuation in
            queue.async { [self] in
                let configuredState = configureSessionInputsOnQueue()
                guard configuredState == .idle || configuredState == .running else {
                    continuation.resume(returning: configuredState)
                    return
                }
                if !session.isRunning { session.startRunning() }
                continuation.resume(returning: .running)
            }
        }
    }

    func configureSessionInputs() -> CameraPreviewModel.State {
        queue.sync { configureSessionInputsOnQueue() }
    }

    func stop() {
        queue.async { [self] in
            if session.isRunning { session.stopRunning() }
        }
    }

    var isPreviewOnly: Bool {
        queue.sync {
            let hasAudioInput = session.inputs.contains { input in
                (input as? AVCaptureDeviceInput)?.device.hasMediaType(.audio) == true
            }
            return session.outputs.isEmpty && !hasAudioInput
        }
    }

    private func configureSessionInputsOnQueue() -> CameraPreviewModel.State {
        guard !isConfigured else { return session.isRunning ? .running : .idle }
        guard let device = AVCaptureDevice.default(for: .video),
            let input = try? AVCaptureDeviceInput(device: device)
        else {
            return .unavailable
        }

        session.beginConfiguration()
        defer { session.commitConfiguration() }
        guard session.canAddInput(input) else { return .failed("Could not add camera input.") }
        session.addInput(input)
        isConfigured = true
        return .idle
    }
}
