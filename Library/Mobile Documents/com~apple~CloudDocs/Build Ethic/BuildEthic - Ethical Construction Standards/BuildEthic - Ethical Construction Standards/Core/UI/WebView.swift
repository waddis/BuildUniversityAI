import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: config)
        view.allowsBackForwardNavigationGestures = true
        view.accessibilityLabel = "Course Player"
        return view
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.load(URLRequest(
            url: url, 
            cachePolicy: .reloadIgnoringLocalCacheData
        ))
    }
}



