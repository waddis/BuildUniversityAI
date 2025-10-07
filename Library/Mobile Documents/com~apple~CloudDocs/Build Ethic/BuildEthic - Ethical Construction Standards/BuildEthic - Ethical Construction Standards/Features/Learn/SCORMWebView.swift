import SwiftUI
import WebKit

final class SCORMWebViewCoordinator: NSObject, WKScriptMessageHandler {
    let onSCORMMessage: (SCORMMessage) -> Void
    let onXAPI: (XAPIStatement) -> Void
    let on3DModel: (() -> Void)?

    init(onSCORMMessage: @escaping (SCORMMessage) -> Void, onXAPI: @escaping (XAPIStatement) -> Void, on3DModel: (() -> Void)? = nil) {
        self.onSCORMMessage = onSCORMMessage
        self.onXAPI = onXAPI
        self.on3DModel = on3DModel
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "scorm":
            if let dict = message.body as? [String: Any],
               let json = try? JSONSerialization.data(withJSONObject: dict),
               let msg = try? JSONDecoder().decode(SCORMMessage.self, from: json) {
                onSCORMMessage(msg)
            }
        case "xapi":
            if let dict = message.body as? [String: Any] {
                do {
                    let data = try JSONSerialization.data(withJSONObject: dict)
                    let stmt = try JSONDecoder().decode(XAPIStatement.self, from: data)
                    onXAPI(stmt)
                } catch {
                    print("xAPI decode error: \(error)")
                }
            }
        case "roof3d":
            if let dict = message.body as? [String: Any],
               let action = dict["action"] as? String,
               action == "open3d" {
                on3DModel?()
            }
        default:
            break
        }
    }
}

struct SCORMWebView: UIViewRepresentable {
    let launch: SCORMLaunchToken
    let on3DModel: (() -> Void)?

    func makeCoordinator() -> SCORMWebViewCoordinator {
        SCORMWebViewCoordinator(onSCORMMessage: SCORMBridge.shared.handleSCORMMessage(_:),
                                onXAPI: { stmt in SyncQueue.shared.enqueue(statement: stmt) },
                                on3DModel: on3DModel)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let uc = WKUserContentController()
        uc.add(context.coordinator, name: "scorm")
        uc.add(context.coordinator, name: "xapi")
        uc.add(context.coordinator, name: "roof3d")
        config.userContentController = uc

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = SCORMBridge.shared

        var request = URLRequest(url: launch.launchUrl)
        if let token = AuthSessionKeychain.shared.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.setValue(launch.xapiAuthToken, forHTTPHeaderField: "X-XAPI-Token")
        webView.load(request)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
