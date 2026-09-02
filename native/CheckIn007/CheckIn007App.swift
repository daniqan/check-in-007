import SwiftUI

/// SwiftUI app entry point. Wires the store, camera, and audio services into a single `AppModel`
/// and hosts the kiosk root.
@main
struct CheckIn007App: App {
    @State private var model: AppModel

    init() {
        let logURL = Self.logFileURL()
        let store = CheckInStore(defaults: UserDefaults.standard, fileURL: logURL)
        let camera = CameraPreviewModel()
        let audio = ScanAudioPlayer()
        _model = State(initialValue: AppModel(store: store, camera: camera, audio: audio))
    }

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .preferredColorScheme(.dark)
        }
    }

    private static func logFileURL() -> URL {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documents.appendingPathComponent("check-in-007-log.json")
    }
}

/// Hosts the loading → roster → scan → result state machine and the admin sheet.
struct RootView: View {
    @Bindable var model: AppModel
    @State private var showAdmin = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            switch model.screen {
            case .loading:
                LoadingView { model.enterRoster() }
                    .onAppear { model.start() }
            case .roster:
                RosterView(model: model) { showAdmin = true }
            case let .scan(guest):
                ScanView(camera: model.camera, guest: guest) { model.finishScan() }
            case let .result(guest, repeatVisit):
                ResultView(guest: guest, repeatVisit: repeatVisit) { model.dismissResult() }
            }
        }
        .sheet(isPresented: $showAdmin) {
            AdminSheet(model: model)
        }
    }
}
