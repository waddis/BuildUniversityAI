import Foundation

public struct JurisdictionSnapshot: Codable, Equatable, Hashable {
    public struct Climate: Codable, Hashable { public let ieccZone: String; public let source: String; public let retrievedAt: Date }
    public struct Hazards: Codable, Hashable { public let windVult: Double?; public let snowPs: Double?; public let seismicSs: Double?; public let source: String; public let retrievedAt: Date }
    public struct Adoptions: Codable, Hashable { public let irc: String?; public let iecc: String?; public let nec: String?; public let imc: String?; public let ipc: String?; public let notes: String?; public let source: String; public let retrievedAt: Date }
    public struct Amendment: Codable, Hashable { public let jurisdictionName: String; public let section: String; public let summary: String; public let url: URL?; public let retrievedAt: Date }

    public let zip: String
    public let city: String?
    public let state: String?
    public let climate: Climate?
    public let hazards: Hazards?
    public let adoptions: Adoptions?
    public let amendments: [Amendment]

    public init(zip: String, city: String?, state: String?, climate: Climate?, hazards: Hazards?, adoptions: Adoptions?, amendments: [Amendment]) {
        self.zip = zip; self.city = city; self.state = state; self.climate = climate; self.hazards = hazards; self.adoptions = adoptions; self.amendments = amendments
    }
}

public protocol JurisdictionProvider {
    func snapshot(forZIP zip: String) async throws -> JurisdictionSnapshot
}

public final class DefaultJurisdictionProvider: JurisdictionProvider {
    public init() {}
    public func snapshot(forZIP zip: String) async throws -> JurisdictionSnapshot {
        // Deterministic mock for now
        let climate = JurisdictionSnapshot.Climate(ieccZone: "5A", source: "Mock", retrievedAt: Date())
        let hazards = JurisdictionSnapshot.Hazards(windVult: 130, snowPs: 30, seismicSs: 0.5, source: "Mock", retrievedAt: Date())
        let adoptions = JurisdictionSnapshot.Adoptions(irc: "2021", iecc: "2021", nec: "2023", imc: "2021", ipc: "2021", notes: nil, source: "Mock", retrievedAt: Date())
        return JurisdictionSnapshot(zip: zip, city: "Sample City", state: "ST", climate: climate, hazards: hazards, adoptions: adoptions, amendments: [])
    }
}

