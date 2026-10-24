// What the iPhone itself can do for WrongTrain, free and with no signal (src/sync/apple.ts):
// - read text through the camera (menus, signs), with live highlighting, then Translate;
// - translate on the phone (Apple's Translation; a language is downloaded once);
// - Apple's on-device language model for small jobs: picking places nearby, filing a simple note.
// Each is checked on each device; the app falls back (Google Translate, Claude) where it's missing.

import Foundation
import UIKit
import SwiftUI
import AVFoundation
import Capacitor
import VisionKit
#if canImport(Translation)
import Translation
#endif
#if canImport(FoundationModels)
import FoundationModels
#endif

/// The app's own bridge, so this add-on is registered when the app starts.
class WTBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WrongTrainNativePlugin())
    }
}

@objc(WrongTrainNativePlugin)
public class WrongTrainNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WrongTrainNativePlugin"
    public let jsName = "WrongTrainNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "capabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "translate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickNearby", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "quickFile", returnType: CAPPluginReturnPromise),
    ]

    // MARK: what this device can do

    @objc func capabilities(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var scanner = false
            if #available(iOS 16.0, *) { scanner = DataScannerViewController.isSupported }
            var translate = false
            if #available(iOS 18.0, *) { translate = true }
            var ai = false, aiWhy = "Needs iOS 26 and Apple Intelligence"
            #if canImport(FoundationModels)
            if #available(iOS 26.0, *) {
                switch SystemLanguageModel.default.availability {
                case .available: ai = true; aiWhy = ""
                case .unavailable(let reason): aiWhy = String(describing: reason)
                }
            }
            #endif
            call.resolve(["scanner": scanner, "translate": translate, "ai": ai, "aiWhy": aiWhy])
        }
    }

    // MARK: camera text

    @objc func scanText(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { return call.reject("This iPhone can't read text with the camera.") }
        let languages = call.getArray("languages", String.self) ?? []
        let start = {
            DispatchQueue.main.async {
                guard DataScannerViewController.isSupported else { return call.reject("This iPhone can't read text with the camera.") }
                let vc = ScanController(languages: languages) { lines in
                    if let lines { call.resolve(["lines": lines]) } else { call.resolve(["lines": [], "cancelled": true]) }
                }
                vc.modalPresentationStyle = .fullScreen
                self.bridge?.viewController?.present(vc, animated: true)
            }
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: start()
        case .notDetermined: AVCaptureDevice.requestAccess(for: .video) { ok in ok ? start() : call.reject("Camera access is off. Turn it on in Settings, then WrongTrain.") }
        default: call.reject("Camera access is off. Turn it on in Settings, then WrongTrain.")
        }
    }

    // MARK: translation

    @objc func translate(_ call: CAPPluginCall) {
        guard #available(iOS 18.0, *) else { return call.reject("Translating on the phone needs iOS 18.") }
        let texts = call.getArray("texts", String.self) ?? []
        let target = call.getString("target") ?? "en"
        let source = call.getString("source")
        if texts.isEmpty { return call.resolve(["texts": []]) }
        DispatchQueue.main.async {
            guard let parent = self.bridge?.viewController else { return call.reject("No screen to translate on.") }
            var host: UIViewController?
            let finish: ([String]?, String?) -> Void = { out, err in
                DispatchQueue.main.async {
                    host?.willMove(toParent: nil); host?.view.removeFromSuperview(); host?.removeFromParent()
                    if let out { call.resolve(["texts": out]) } else { call.reject(err ?? "Couldn't translate that.") }
                }
            }
            let config = TranslationSession.Configuration(source: source.map { Locale.Language(identifier: $0) }, target: Locale.Language(identifier: target))
            let h = UIHostingController(rootView: TranslateHost(config: config, texts: texts, done: finish))
            h.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            h.view.backgroundColor = .clear
            parent.addChild(h); parent.view.addSubview(h.view); h.didMove(toParent: parent)
            host = h
        }
    }

    // MARK: on-device model

    @objc func pickNearby(_ call: CAPPluginCall) {
        #if canImport(FoundationModels)
        guard #available(iOS 26.0, *), case .available = SystemLanguageModel.default.availability else { return call.reject("unavailable") }
        let instructions = call.getString("instructions") ?? "", prompt = call.getString("prompt") ?? ""
        Task {
            do {
                let session = LanguageModelSession(instructions: instructions)
                let r = try await session.respond(to: prompt, generating: NearbyPicks.self)
                call.resolve(["picks": r.content.picks.map { ["id": $0.id, "why": $0.why] }])
            } catch { call.reject(error.localizedDescription) }
        }
        #else
        call.reject("unavailable")
        #endif
    }

    @objc func quickFile(_ call: CAPPluginCall) {
        #if canImport(FoundationModels)
        guard #available(iOS 26.0, *), case .available = SystemLanguageModel.default.availability else { return call.reject("unavailable") }
        let instructions = call.getString("instructions") ?? "", prompt = call.getString("prompt") ?? ""
        Task {
            do {
                let session = LanguageModelSession(instructions: instructions)
                let r = try await session.respond(to: prompt, generating: QuickFiling.self).content
                call.resolve(["kind": r.kind, "text": r.text, "placeKind": r.placeKind, "city": r.city])
            } catch { call.reject(error.localizedDescription) }
        }
        #else
        call.reject("unavailable")
        #endif
    }
}

// MARK: - the camera screen

@available(iOS 16.0, *)
final class ScanController: UIViewController, DataScannerViewControllerDelegate {
    private let scanner: DataScannerViewController
    private let finish: ([String]?) -> Void
    private var items: [RecognizedItem] = []
    private var done = false

    init(languages: [String], finish: @escaping ([String]?) -> Void) {
        let supported = DataScannerViewController.supportedTextRecognitionLanguages
        /* "ja" becomes the reader's own "ja-JP"; languages it can't read are left out */
        let langs = languages.compactMap { l in supported.first { $0 == l || $0.hasPrefix(l + "-") } }
        scanner = DataScannerViewController(recognizedDataTypes: [.text(languages: langs)], qualityLevel: .accurate,
                                            recognizesMultipleItems: true, isHighFrameRateTrackingEnabled: false,
                                            isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: true)
        self.finish = finish
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        scanner.delegate = self
        addChild(scanner)
        scanner.view.frame = view.bounds
        scanner.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(scanner.view)
        scanner.didMove(toParent: self)

        var go = UIButton.Configuration.filled()
        go.title = "Translate"; go.cornerStyle = .capsule
        go.baseBackgroundColor = UIColor(red: 0.95, green: 0.72, blue: 0.29, alpha: 1); go.baseForegroundColor = .black
        go.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 28, bottom: 14, trailing: 28)
        let translate = UIButton(configuration: go, primaryAction: UIAction { [weak self] _ in self?.close(with: self?.lines()) })
        var no = UIButton.Configuration.gray()
        no.title = "Cancel"; no.cornerStyle = .capsule
        no.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 22, bottom: 14, trailing: 22)
        let cancel = UIButton(configuration: no, primaryAction: UIAction { [weak self] _ in self?.close(with: nil) })
        let row = UIStackView(arrangedSubviews: [cancel, translate])
        row.spacing = 14; row.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(row)

        let hint = UILabel()
        hint.text = "Point at a menu or a sign. Tap Translate when the text is outlined."
        hint.textColor = .white; hint.numberOfLines = 0; hint.textAlignment = .center
        hint.font = .systemFont(ofSize: 15, weight: .semibold)
        hint.backgroundColor = UIColor.black.withAlphaComponent(0.55); hint.layer.cornerRadius = 12; hint.clipsToBounds = true
        hint.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hint)

        NSLayoutConstraint.activate([
            row.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            row.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            hint.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            hint.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            hint.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        try? scanner.startScanning()
    }

    func dataScanner(_ s: DataScannerViewController, didAdd added: [RecognizedItem], allItems: [RecognizedItem]) { items = allItems }
    func dataScanner(_ s: DataScannerViewController, didUpdate updated: [RecognizedItem], allItems: [RecognizedItem]) { items = allItems }
    func dataScanner(_ s: DataScannerViewController, didRemove removed: [RecognizedItem], allItems: [RecognizedItem]) { items = allItems }
    /// Tapping one outlined line translates just that line.
    func dataScanner(_ s: DataScannerViewController, didTapOn item: RecognizedItem) {
        if case .text(let t) = item { close(with: [t.transcript]) }
    }

    /// The outlined text, top to bottom, left to right.
    private func lines() -> [String] {
        items.compactMap { item -> (CGPoint, String)? in
            if case .text(let t) = item { return (t.bounds.topLeft, t.transcript) }
            return nil
        }
        .sorted { abs($0.0.y - $1.0.y) > 12 ? $0.0.y < $1.0.y : $0.0.x < $1.0.x }
        .map { $0.1.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    }

    private func close(with lines: [String]?) {
        if done { return }
        done = true
        scanner.stopScanning()
        dismiss(animated: true) { self.finish(lines) }
    }
}

// MARK: - translating, through a view the Translation framework can show its download prompt from

@available(iOS 18.0, *)
struct TranslateHost: View {
    let config: TranslationSession.Configuration
    let texts: [String]
    let done: ([String]?, String?) -> Void

    var body: some View {
        Color.clear.frame(width: 1, height: 1)
            .translationTask(config) { session in
                do {
                    try await session.prepareTranslation()
                    let requests = texts.enumerated().map { TranslationSession.Request(sourceText: $0.element, clientIdentifier: String($0.offset)) }
                    let responses = try await session.translations(from: requests)
                    var out = texts
                    for r in responses { if let id = r.clientIdentifier, let i = Int(id), i < out.count { out[i] = r.targetText } }
                    done(out, nil)
                } catch {
                    done(nil, error.localizedDescription)
                }
            }
    }
}

// MARK: - what the on-device model answers with

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct NearbyPick {
    @Guide(description: "The id of one place from the list, exactly as given")
    var id: String
    @Guide(description: "One short line on why it suits the mood right now")
    var why: String
}

@available(iOS 26.0, *)
@Generable
struct NearbyPicks {
    @Guide(description: "Up to five places from the list, best first")
    var picks: [NearbyPick]
}

@available(iOS 26.0, *)
@Generable
struct QuickFiling {
    @Guide(description: "todo if the note is a task someone has to do; place if it names one specific place to visit, eat, drink or shop at; other for anything else, or if unsure")
    var kind: String
    @Guide(description: "For a todo: the task as a short line, like 'Book the Narita Express'. For a place: just the place's name.")
    var text: String
    @Guide(description: "For a place: one of sight, food, coffee, shop, event, area or other. Empty for a todo.")
    var placeKind: String
    @Guide(description: "For a place: the trip city it is in, exactly as listed, or empty if not clear")
    var city: String
}
#endif
