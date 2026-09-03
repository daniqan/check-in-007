import AVFoundation
import XCTest

@testable import CheckIn007

@MainActor
final class CameraPrivacyTests: XCTestCase {
    func testSessionNeverHasAudioInputOrOutputs() {
        let model = CameraPreviewModel()
        _ = model.configureSessionInputs()
        // On the simulator there is no camera device, so no inputs are added; the invariant that
        // the session carries no audio input and no capture outputs must hold regardless.
        XCTAssertTrue(model.isPreviewOnly)
        XCTAssertTrue(model.session.outputs.isEmpty)
        XCTAssertFalse(
            model.session.inputs.contains { input in
                (input as? AVCaptureDeviceInput)?.device.hasMediaType(.audio) == true
            }
        )
    }

    func testAuthorizationMappingFallsBackToCovert() {
        XCTAssertEqual(CameraPreviewModel.mapAuthorization(.denied), .denied)
        XCTAssertEqual(CameraPreviewModel.mapAuthorization(.restricted), .denied)
        XCTAssertEqual(CameraPreviewModel.mapAuthorization(.authorized), .running)
        XCTAssertEqual(CameraPreviewModel.mapAuthorization(.notDetermined), .requestingPermission)
    }

    func testStartOnSimulatorDoesNotCrashAndStaysNonRunning() async {
        let model = CameraPreviewModel(
            authorizationStatus: { .authorized },
            requestAccess: {
                XCTFail("Authorized startup must not request permission")
                return false
            }
        )
        await model.start()
        // Without a camera device or granted permission, the model must not be left "running".
        XCTAssertNotEqual(model.state, .running)
        model.stop()
        XCTAssertFalse(model.session.isRunning)
    }
}
