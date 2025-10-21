import Foundation

/// Secure configuration management for API keys and endpoints
final class ConfigurationManager {
    static let shared = ConfigurationManager()
    
    private init() {}
    
    // MARK: - API Configuration
    
    var zipCodeAPIKey: String {
        // Get from environment variable or secure storage
        if let key = ProcessInfo.processInfo.environment["ZIPCODE_API_KEY"] {
            return key
        }
        
        // Fallback to Info.plist for development
        if let key = Bundle.main.object(forInfoDictionaryKey: "ZIPCODE_API_KEY") as? String {
            return key
        }
        
        // Development fallback - should never be used in production
        #if DEBUG
        return "demo_key_development_only"
        #else
        fatalError("ZIPCODE_API_KEY not configured")
        #endif
    }
    
    var zipCodeBaseURL: String {
        return "https://api.zipcodebase.com/v1/search"
    }
    
    var jurisdictionBaseURL: String {
        return "https://api.iccsafe.org/jurisdiction"
    }
    
    // MARK: - Network Configuration
    
    var requestTimeout: TimeInterval {
        return 30.0
    }
    
    var maxRetryAttempts: Int {
        return 3
    }
    
    // MARK: - Security Configuration
    
    var enableCertificatePinning: Bool {
        #if DEBUG
        return false
        #else
        return true
        #endif
    }
    
    var allowedHosts: Set<String> {
        return [
            "api.zipcodebase.com",
            "api.iccsafe.org"
        ]
    }
}
