import Foundation

public struct SCORMLaunchToken: Codable {
    public let launchUrl: URL            // signed URL to index.html inside SCORM package (server or local)
    public let scoId: String             // SNO / item identifier
    public let launchId: String          // unique launch session
    public let learnerId: String         // user id
    public let learnerName: String       // display name
    public let expiry: Date
    public let xapiEndpoint: URL         // server proxy endpoint
    public let xapiAuthToken: String     // short-lived token (NOT the app JWT)
}

public enum SCORMCommand: String, Codable {
    case initialize = "LMSInitialize"
    case getValue = "LMSGetValue"
    case setValue = "LMSSetValue"
    case commit = "LMSCommit"
    case finish = "LMSFinish"
}

public struct SCORMMessage: Codable {
    public let command: SCORMCommand
    public let key: String?
    public let value: String?
}

public struct XAPIStatement: Codable, Identifiable {
    public let id: UUID
    public let launchId: String
    public let actor: [String: String]
    public let verb: [String: String]
    public let `object`: [String: AnyCodable]
    public let context: [String: AnyCodable]?
    public let result: [String: AnyCodable]?
    public let timestamp: Date

    public init(id: UUID = UUID(), launchId: String, actor: [String: String], verb: [String: String], object: [String: AnyCodable], context: [String: AnyCodable]? = nil, result: [String: AnyCodable]? = nil, timestamp: Date = Date()) {
        self.id = id
        self.launchId = launchId
        self.actor = actor
        self.verb = verb
        self.object = object
        self.context = context
        self.result = result
        self.timestamp = timestamp
    }
}

// Lightweight type-erasure for JSON payloads
public struct AnyCodable: Codable {
    public let value: Any
    public init(_ value: Any) { self.value = value }
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) { value = intVal; return }
        if let dblVal = try? container.decode(Double.self) { value = dblVal; return }
        if let boolVal = try? container.decode(Bool.self) { value = boolVal; return }
        if let strVal = try? container.decode(String.self) { value = strVal; return }
        if let dictVal = try? container.decode([String: AnyCodable].self) { value = dictVal.mapValues { $0.value }; return }
        if let arrVal = try? container.decode([AnyCodable].self) { value = arrVal.map { $0.value }; return }
        value = ""
    }
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let intVal as Int: try container.encode(intVal)
        case let dblVal as Double: try container.encode(dblVal)
        case let boolVal as Bool: try container.encode(boolVal)
        case let strVal as String: try container.encode(strVal)
        case let dictVal as [String: Any]: try container.encode(dictVal.mapValues { AnyCodable($0) })
        case let arrVal as [Any]: try container.encode(arrVal.map { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }
}
