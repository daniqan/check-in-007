import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// The hidden operator console: roster CSV import/reset, CSV/JSON export via the iPad share sheet,
/// copy to `UIPasteboard`, log merge preview/apply, double-confirmed clear-log, and the default-off
/// scan-blip toggle.
struct AdminSheet: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss

    @State private var clearArmed = false
    @State private var shareText: ShareText?
    @State private var showRosterImporter = false
    @State private var showLogImporter = false

    var body: some View {
        NavigationStack {
            Form {
                statusSection
                rosterSection
                exportSection
                mergeSection
                dangerSection
                audioSection
            }
            .navigationTitle("Operations")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier(A11y.adminClose)
                }
            }
        }
        .accessibilityIdentifier(A11y.adminSheet)
        .sheet(item: $shareText) { payload in
            ShareSheet(text: payload.text)
        }
        .fileImporter(
            isPresented: $showRosterImporter,
            allowedContentTypes: [.commaSeparatedText, .plainText]
        ) { result in
            handleImport(result) { model.importRoster(contents: $0) }
        }
        .fileImporter(
            isPresented: $showLogImporter,
            allowedContentTypes: [.commaSeparatedText, .plainText, .json],
            allowsMultipleSelection: true
        ) { result in
            handleLogImport(result)
        }
    }

    private var statusSection: some View {
        Section("Status") {
            Text(model.adminStatus.isEmpty ? "\(model.logCount()) check-ins recorded." : model.adminStatus)
                .font(Theme.Typography.caption)
        }
    }

    private var rosterSection: some View {
        Section("Roster") {
            Button("Import roster CSV") { showRosterImporter = true }
                .accessibilityIdentifier(A11y.importRoster)
            Button("Reset roster to defaults") { model.resetRoster() }
                .accessibilityIdentifier(A11y.resetRoster)
        }
    }

    private var exportSection: some View {
        Section("Export") {
            Button("Share CSV") { shareText = ShareText(text: model.exportLogCsv()) }
                .accessibilityIdentifier(A11y.exportCsv)
            Button("Share JSON") { shareText = ShareText(text: model.exportLogJson()) }
                .accessibilityIdentifier(A11y.exportJson)
            Button("Copy CSV") { UIPasteboard.general.string = model.exportLogCsv() }
            Button("Copy JSON") { UIPasteboard.general.string = model.exportLogJson() }
        }
    }

    private var mergeSection: some View {
        Section("Merge logs") {
            Button("Preview merge from files") { showLogImporter = true }
                .accessibilityIdentifier(A11y.mergePreview)
            if let pending = model.pendingMerge {
                Text(
                    "New \(pending.acceptedCount), duplicates \(pending.duplicateCount), "
                        + "invalid \(pending.invalidImportedCount), total \(pending.finalCount)."
                )
                .font(Theme.Typography.caption)
                Button("Apply merge") { model.applyMerge() }
                    .accessibilityIdentifier(A11y.mergeApply)
            }
        }
    }

    private var dangerSection: some View {
        Section("Danger") {
            Button(clearArmed ? "Tap again to confirm clear" : "Clear check-in log", role: .destructive) {
                if clearArmed {
                    model.clearLog(confirming: true)
                    clearArmed = false
                } else {
                    clearArmed = true
                }
            }
            .accessibilityIdentifier(clearArmed ? A11y.clearLogConfirm : A11y.clearLog)
        }
    }

    private var audioSection: some View {
        Section("Audio") {
            Toggle(
                "Scan blip (off by default)",
                isOn: Binding(
                    get: { model.audioSettings.scanBlipEnabled },
                    set: { model.setScanBlipEnabled($0) }
                )
            )
            .accessibilityIdentifier(A11y.audioToggle)
        }
    }

    private func handleImport(_ result: Result<URL, Error>, _ apply: (String) -> Void) {
        guard case let .success(url) = result else { return }
        let didAccess = url.startAccessingSecurityScopedResource()
        defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
        if let contents = try? String(contentsOf: url, encoding: .utf8) {
            apply(contents)
        }
    }

    private func handleLogImport(_ result: Result<[URL], Error>) {
        guard case let .success(urls) = result else { return }
        var files: [ImportedFile] = []
        for url in urls {
            let didAccess = url.startAccessingSecurityScopedResource()
            defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
            if let contents = try? String(contentsOf: url, encoding: .utf8) {
                files.append(ImportedFile(name: url.lastPathComponent, contents: contents))
            }
        }
        model.previewMerge(files: files)
    }
}

/// Identifiable wrapper so a plain string can drive a `.sheet(item:)`.
private struct ShareText: Identifiable {
    let id = UUID()
    let text: String
}

/// Minimal UIKit share-sheet bridge for CSV/JSON export.
private struct ShareSheet: UIViewControllerRepresentable {
    let text: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [text], applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
