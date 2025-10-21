import Foundation
import Network

/// Secure network manager with proper error handling and security measures
final class SecureNetworkManager {
    static let shared = SecureNetworkManager()
    
    private let session: URLSession
    private let configuration = ConfigurationManager.shared
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = configuration.requestTimeout
        config.timeoutIntervalForResource = configuration.requestTimeout * 2
        config.waitsForConnectivity = true
        
        // Create session with custom delegate for security
        self.session = URLSession(configuration: config, delegate: SecurityDelegate(), delegateQueue: nil)
    }
    
    // MARK: - Secure Network Requests
    
    func request<T: Codable>(_ endpoint: APIEndpoint, responseType: T.Type) async throws -> T {
        let url = try buildSecureURL(for: endpoint)
        var request = URLRequest(url: url)
        
        // Set security headers
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("BuildUniversityAI/1.0", forHTTPHeaderField: "User-Agent")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        
        // Add API key if required
        if endpoint.requiresAPIKey {
            request.setValue("Bearer \(configuration.zipCodeAPIKey)", forHTTPHeaderField: "Authorization")
        }
        
        // Perform request with retry logic
        return try await performRequestWithRetry(request, responseType: responseType)
    }
    
    // MARK: - Private Methods
    
    private func buildSecureURL(for endpoint: APIEndpoint) throws -> URL {
        var components = URLComponents(string: endpoint.baseURL)
        components?.path = endpoint.path
        
        // Validate and sanitize query parameters
        if let queryItems = endpoint.queryItems {
            var sanitizedItems: [URLQueryItem] = []
            
            for item in queryItems {
                let sanitizedValue = ValidationUtils.sanitizeURLParameter(item.value ?? "")
                if !sanitizedValue.isEmpty {
                    sanitizedItems.append(URLQueryItem(name: item.name, value: sanitizedValue))
                }
            }
            
            components?.queryItems = sanitizedItems
        }
        
        guard let url = components?.url else {
            throw NetworkError.invalidURL
        }
        
        // Validate host is allowed
        guard let host = url.host, configuration.allowedHosts.contains(host) else {
            throw NetworkError.unauthorizedHost
        }
        
        return url
    }
    
    private func performRequestWithRetry<T: Codable>(_ request: URLRequest, responseType: T.Type) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...configuration.maxRetryAttempts {
            do {
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw NetworkError.invalidResponse
                }
                
                // Validate response
                try validateResponse(httpResponse)
                
                // Decode response
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                
                return try decoder.decode(responseType, from: data)
                
            } catch {
                lastError = error
                
                // Don't retry on client errors (4xx)
                if let networkError = error as? NetworkError,
                   case .clientError(let statusCode) = networkError,
                   statusCode >= 400 && statusCode < 500 {
                    throw error
                }
                
                // Wait before retry (exponential backoff)
                if attempt < configuration.maxRetryAttempts {
                    try await Task.sleep(nanoseconds: UInt64(pow(2.0, Double(attempt)) * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? NetworkError.unknown
    }
    
    private func validateResponse(_ response: HTTPURLResponse) throws {
        switch response.statusCode {
        case 200...299:
            break // Success
        case 400...499:
            throw NetworkError.clientError(response.statusCode)
        case 500...599:
            throw NetworkError.serverError(response.statusCode)
        default:
            throw NetworkError.unexpectedStatusCode(response.statusCode)
        }
    }
}

// MARK: - API Endpoint Definition

struct APIEndpoint {
    let baseURL: String
    let path: String
    let queryItems: [URLQueryItem]?
    let requiresAPIKey: Bool
    
    static func zipCodeLookup(zip: String) -> APIEndpoint {
        return APIEndpoint(
            baseURL: ConfigurationManager.shared.zipCodeBaseURL,
            path: "/search",
            queryItems: [
                URLQueryItem(name: "apikey", value: ConfigurationManager.shared.zipCodeAPIKey),
                URLQueryItem(name: "codes", value: zip)
            ],
            requiresAPIKey: true
        )
    }
    
    static func jurisdictionLookup(state: String, city: String) -> APIEndpoint {
        let sanitizedState = ValidationUtils.sanitizeURLParameter(state)
        let sanitizedCity = ValidationUtils.sanitizeURLParameter(city)
        
        return APIEndpoint(
            baseURL: ConfigurationManager.shared.jurisdictionBaseURL,
            path: "/\(sanitizedState)/\(sanitizedCity)",
            queryItems: nil,
            requiresAPIKey: false
        )
    }
}

// MARK: - Network Errors

enum NetworkError: LocalizedError {
    case invalidURL
    case unauthorizedHost
    case invalidResponse
    case clientError(Int)
    case serverError(Int)
    case unexpectedStatusCode(Int)
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL format"
        case .unauthorizedHost:
            return "Unauthorized host"
        case .invalidResponse:
            return "Invalid response format"
        case .clientError(let code):
            return "Client error: \(code)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .unexpectedStatusCode(let code):
            return "Unexpected status code: \(code)"
        case .unknown:
            return "Unknown network error"
        }
    }
}

// MARK: - Security Delegate

private class SecurityDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        // For now, accept all certificates in development
        // In production, implement proper certificate pinning
        #if DEBUG
        completionHandler(.performDefaultHandling, nil)
        #else
        // TODO: Implement certificate pinning for production
        completionHandler(.performDefaultHandling, nil)
        #endif
    }
}
