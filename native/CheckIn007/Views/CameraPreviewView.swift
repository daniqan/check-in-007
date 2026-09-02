import AVFoundation
import SwiftUI
import UIKit

/// A UIView whose backing layer is an `AVCaptureVideoPreviewLayer`, so the preview fills the view.
final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    var previewLayer: AVCaptureVideoPreviewLayer {
        // swiftlint:disable:next force_cast
        layer as! AVCaptureVideoPreviewLayer
    }
}

/// SwiftUI bridge to the AVFoundation preview layer. Uses `@ObservedObject` on the reference-type
/// `CameraPreviewModel` — the established pattern for bridging a capture session into SwiftUI.
struct CameraPreviewView: UIViewRepresentable {
    @ObservedObject var model: CameraPreviewModel

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = model.session
        view.previewLayer.videoGravity = .resizeAspectFill
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.previewLayer.session = model.session
    }
}
