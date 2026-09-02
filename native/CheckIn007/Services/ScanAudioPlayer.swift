import AVFoundation
import Foundation

/// Behavior contract for the optional scan cue so `AppModel` and tests can depend on an abstraction.
protocol ScanAudioPlaying: AnyObject {
    func setEnabled(_ enabled: Bool)
    func unlockFromGesture()
    func playScanBlip()
    func stop()
}

/// Optional, default-off synthesized scan "blip". The cue is a short rising sine burst that
/// approximates the web sweep — it never loops, never plays in the background, and never requests
/// microphone permission. All audio-engine failures are swallowed (non-fatal): a broken/muted/
/// interrupted audio session must never block check-in.
///
/// Cue parameters mirror the web config exactly (`src/config.mjs` `AUDIO`) so the native cue matches
/// the browser cue and `ScanAudioPlayerTests` can assert parity like the timing constants.
final class ScanAudioPlayer: ScanAudioPlaying {
    enum Cue {
        static let defaultEnabled = false
        static let gain: Float = 0.045
        static let startHz: Double = 880
        static let endHz: Double = 1320
        static let durationMs: Double = 90
        static let releaseSeconds: Double = 0.035
    }

    private let engine = AVAudioEngine()
    private var playerNode: AVAudioPlayerNode?
    private(set) var isEnabled = false
    private(set) var isUnlocked = false

    init(enabled: Bool = Cue.defaultEnabled) {
        isEnabled = enabled
    }

    func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        if !enabled { stop() }
    }

    /// Record a genuine user gesture so the cue may play. AVFoundation does not require a gesture
    /// unlock like WebAudio, but we keep the same explicit-consent posture as the web app.
    func unlockFromGesture() {
        isUnlocked = true
    }

    /// True iff the cue is permitted to sound right now.
    var shouldPlay: Bool { isEnabled && isUnlocked }

    /// Play one short rising cue if permitted. No-throw: any engine error disables the cue for this
    /// attempt without propagating.
    func playScanBlip() {
        guard shouldPlay else { return }
        do {
            let buffer = try makeCueBuffer()
            let node = playerNode ?? AVAudioPlayerNode()
            if playerNode == nil {
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: buffer.format)
                playerNode = node
            }
            if !engine.isRunning {
                try engine.start()
            }
            node.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
            node.play()
        } catch {
            // Non-fatal: skip the cue without blocking the result screen.
        }
    }

    func stop() {
        playerNode?.stop()
        if engine.isRunning {
            engine.stop()
        }
    }

    /// Build a short rising-pitch sine burst with a brief linear release, matching the web cue's
    /// gain/frequency/duration/release. Marked `throws` so buffer allocation failure is non-fatal.
    private func makeCueBuffer() throws -> AVAudioPCMBuffer {
        let sampleRate = 44_100.0
        let durationSeconds = Cue.durationMs / 1000.0
        let totalSeconds = durationSeconds + Cue.releaseSeconds
        let frameCount = AVAudioFrameCount(sampleRate * totalSeconds)
        guard
            let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)
        else {
            throw NSError(domain: "ScanAudioPlayer", code: 1)
        }
        buffer.frameLength = frameCount

        let samples = buffer.floatChannelData![0]
        var phase = 0.0
        for frame in 0..<Int(frameCount) {
            let time = Double(frame) / sampleRate
            let progress = min(time / durationSeconds, 1.0)
            let frequency = Cue.startHz + (Cue.endHz - Cue.startHz) * progress
            phase += 2.0 * Double.pi * frequency / sampleRate

            let envelope: Double
            if time <= durationSeconds {
                envelope = 1.0
            } else {
                let releaseProgress = (time - durationSeconds) / Cue.releaseSeconds
                envelope = max(0.0, 1.0 - releaseProgress)
            }
            samples[frame] = Float(sin(phase) * envelope) * Cue.gain
        }
        return buffer
    }
}
