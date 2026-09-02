import XCTest

@testable import CheckIn007

final class ScanAudioPlayerTests: XCTestCase {
    func testDefaultOffDoesNotPlay() {
        let player = ScanAudioPlayer()
        XCTAssertFalse(player.isEnabled)
        player.unlockFromGesture()
        XCTAssertFalse(player.shouldPlay)  // still disabled
        player.playScanBlip()  // must not throw or crash
    }

    func testEnabledCuePathRequiresGestureUnlock() {
        let player = ScanAudioPlayer()
        player.setEnabled(true)
        XCTAssertFalse(player.shouldPlay)  // enabled but not unlocked
        player.unlockFromGesture()
        XCTAssertTrue(player.shouldPlay)
        player.playScanBlip()  // exercises the enabled cue path, must be non-throwing
        player.stop()
    }

    func testDisablingStopsPlayback() {
        let player = ScanAudioPlayer(enabled: true)
        player.unlockFromGesture()
        XCTAssertTrue(player.shouldPlay)
        player.setEnabled(false)
        XCTAssertFalse(player.shouldPlay)
    }

    func testCueConstantsMatchWebConfig() {
        // Parity with src/config.mjs AUDIO (verified byte-for-byte).
        XCTAssertEqual(ScanAudioPlayer.Cue.defaultEnabled, false)
        XCTAssertEqual(ScanAudioPlayer.Cue.gain, 0.045)
        XCTAssertEqual(ScanAudioPlayer.Cue.startHz, 880)
        XCTAssertEqual(ScanAudioPlayer.Cue.endHz, 1320)
        XCTAssertEqual(ScanAudioPlayer.Cue.durationMs, 90)
        XCTAssertEqual(ScanAudioPlayer.Cue.releaseSeconds, 0.035)
    }
}
