import Foundation

/// Input validation utilities for security
struct ValidationUtils {
    
    // MARK: - ZIP Code Validation
    
    static func isValidZIPCode(_ zip: String) -> Bool {
        // Remove any whitespace
        let cleaned = zip.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Must be exactly 5 digits
        guard cleaned.count == 5 else { return false }
        
        // Must be all digits
        guard cleaned.allSatisfy({ $0.isNumber }) else { return false }
        
        // Must not be all zeros or all same digit
        guard cleaned != "00000" && !cleaned.allSatisfy({ $0 == cleaned.first }) else { return false }
        
        // Must be in valid US ZIP range (01000-99999)
        guard let zipInt = Int(cleaned), zipInt >= 1000 && zipInt <= 99999 else { return false }
        
        return true
    }
    
    // MARK: - State Code Validation
    
    static func isValidStateCode(_ state: String) -> Bool {
        let validStates = Set([
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            "DC", "PR", "VI", "GU", "AS", "MP"
        ])
        
        return validStates.contains(state.uppercased())
    }
    
    // MARK: - City Name Validation
    
    static func isValidCityName(_ city: String) -> Bool {
        let cleaned = city.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Must not be empty
        guard !cleaned.isEmpty else { return false }
        
        // Must be reasonable length
        guard cleaned.count >= 2 && cleaned.count <= 50 else { return false }
        
        // Must contain only letters, spaces, hyphens, and apostrophes
        let allowedCharacters = CharacterSet.letters.union(.whitespaces).union(CharacterSet(charactersIn: "-'"))
        guard cleaned.rangeOfCharacter(from: allowedCharacters.inverted) == nil else { return false }
        
        return true
    }
    
    // MARK: - URL Parameter Sanitization
    
    static func sanitizeURLParameter(_ parameter: String) -> String {
        // Remove any potentially dangerous characters
        let allowedCharacters = CharacterSet.alphanumerics.union(.whitespaces).union(CharacterSet(charactersIn: "-_."))
        let sanitized = String(parameter.unicodeScalars.filter { allowedCharacters.contains($0) })
        
        // Trim whitespace and limit length
        return String(sanitized.trimmingCharacters(in: .whitespacesAndNewlines).prefix(100))
    }
    
    // MARK: - Error Messages
    
    static func validationError(for field: String, value: String) -> String {
        switch field.lowercased() {
        case "zip":
            return "Invalid ZIP code format. Please enter a 5-digit US ZIP code."
        case "state":
            return "Invalid state code. Please enter a valid 2-letter state abbreviation."
        case "city":
            return "Invalid city name. Please enter a valid city name."
        default:
            return "Invalid \(field) format: '\(value)'"
        }
    }
}
