import SwiftUI
import Foundation

// MARK: - Jurisdiction Types (Temporary - should be imported from ConstructionCore)
public struct JurisdictionSnapshot: Codable, Equatable, Hashable {
    public struct Climate: Codable, Hashable {
        public let ieccZone: String
        public let source: String
        public let retrievedAt: Date
    }
    
    public struct Hazards: Codable, Hashable {
        public let windVult: Double?
        public let snowPs: Double?
        public let seismicSs: Double?
        public let source: String
        public let retrievedAt: Date
    }
    
    public struct Adoptions: Codable, Hashable {
        public let irc: String?
        public let iecc: String?
        public let nec: String?
        public let imc: String?
        public let ipc: String?
        public let notes: String?
        public let source: String
        public let retrievedAt: Date
    }
    
    public struct Amendment: Codable, Hashable {
        public let jurisdictionName: String
        public let section: String
        public let summary: String
        public let url: URL?
        public let retrievedAt: Date
    }
    
    public let zip: String
    public let city: String?
    public let state: String?
    public let climate: Climate?
    public let hazards: Hazards?
    public let adoptions: Adoptions?
    public let amendments: [Amendment]
    
    public init(zip: String, city: String?, state: String?, climate: Climate?, hazards: Hazards?, adoptions: Adoptions?, amendments: [Amendment]) {
        self.zip = zip
        self.city = city
        self.state = state
        self.climate = climate
        self.hazards = hazards
        self.adoptions = adoptions
        self.amendments = amendments
    }
}

public protocol JurisdictionProvider {
    func snapshot(forZIP zip: String) async throws -> JurisdictionSnapshot
}

public final class DefaultJurisdictionProvider: JurisdictionProvider {
    private let networkManager = SecureNetworkManager.shared
    
    public init() {}
    
    public func snapshot(forZIP zip: String) async throws -> JurisdictionSnapshot {
        // Validate input
        guard ValidationUtils.isValidZIPCode(zip) else {
            throw JurisdictionError.invalidZIP
        }
        
        do {
            // Use secure network manager for ZIP code lookup
            let zipResponse = try await networkManager.request(
                .zipCodeLookup(zip: zip),
                responseType: ZIPCodeResponse.self
            )
            
            guard let zipData = zipResponse.results.first?.value.first else {
                throw JurisdictionError.zipNotFound
            }
            
            // Validate state and city data
            guard ValidationUtils.isValidStateCode(zipData.state),
                  ValidationUtils.isValidCityName(zipData.city) else {
                throw JurisdictionError.invalidLocationData
            }
            
            // Get additional jurisdiction data
            let jurisdictionData = try await getJurisdictionData(
                state: zipData.state,
                city: zipData.city
            )
            
            // Convert to our jurisdiction snapshot format
            let climate = JurisdictionSnapshot.Climate(
                ieccZone: jurisdictionData.climateZone ?? "Unknown",
                source: "ASCE 7-22",
                retrievedAt: Date()
            )
            
            let hazards = JurisdictionSnapshot.Hazards(
                windVult: jurisdictionData.windSpeed,
                snowPs: jurisdictionData.snowLoad,
                seismicSs: jurisdictionData.seismicSs,
                source: "ASCE 7-22 Hazard Tool",
                retrievedAt: Date()
            )
            
            let adoptions = JurisdictionSnapshot.Adoptions(
                irc: jurisdictionData.ircEdition,
                iecc: jurisdictionData.ieccEdition,
                nec: jurisdictionData.necEdition,
                imc: jurisdictionData.imcEdition,
                ipc: jurisdictionData.ipcEdition,
                notes: jurisdictionData.adoptionNotes,
                source: "ICC State Adoption Database",
                retrievedAt: Date()
            )
            
            return JurisdictionSnapshot(
                zip: zip,
                city: zipData.city,
                state: zipData.state,
                climate: climate,
                hazards: hazards,
                adoptions: adoptions,
                amendments: jurisdictionData.localAmendments
            )
            
        } catch let error as NetworkError {
            throw mapNetworkError(error)
        } catch {
            throw JurisdictionError.networkError
        }
    }
    
    private func getJurisdictionData(state: String, city: String) async throws -> JurisdictionData {
        return try await networkManager.request(
            .jurisdictionLookup(state: state, city: city),
            responseType: JurisdictionData.self
        )
    }
    
    private func mapNetworkError(_ error: NetworkError) -> JurisdictionError {
        switch error {
        case .clientError(let code) where code == 404:
            return .zipNotFound
        case .clientError(let code) where code == 400:
            return .invalidZIP
        case .serverError, .networkError:
            return .networkError
        default:
            return .networkError
        }
    }
}

// MARK: - Supporting Types
enum JurisdictionError: Error, LocalizedError {
    case invalidZIP
    case networkError
    case zipNotFound
    case invalidLocationData
    
    var errorDescription: String? {
        switch self {
        case .invalidZIP:
            return "Invalid ZIP code format. Please enter a 5-digit US ZIP code."
        case .networkError:
            return "Network error. Please check your connection and try again."
        case .zipNotFound:
            return "ZIP code not found. Please verify and try again."
        case .invalidLocationData:
            return "Invalid location data received from server."
        }
    }
}

struct ZIPCodeResponse: Codable {
    let results: [String: [ZIPCodeResult]]
}

struct ZIPCodeResult: Codable {
    let city: String
    let state: String
}

struct ZIPCodeData {
    let zip: String
    let city: String
    let state: String
    let climateZone: String?
    let windSpeed: Double?
    let snowLoad: Double?
    let seismicSs: Double?
    let ircEdition: String?
    let ieccEdition: String?
    let necEdition: String?
    let imcEdition: String?
    let ipcEdition: String?
    let adoptionNotes: String?
    let localAmendments: [JurisdictionSnapshot.Amendment]
}

struct JurisdictionData: Codable {
    let climateZone: String?
    let windSpeed: Double?
    let snowLoad: Double?
    let seismicSs: Double?
    let ircEdition: String?
    let ieccEdition: String?
    let necEdition: String?
    let imcEdition: String?
    let ipcEdition: String?
    let adoptionNotes: String?
    let localAmendments: [JurisdictionSnapshot.Amendment]
}

struct CodesView: View {
    @State private var zip: String = ""
    @State private var snapshot: JurisdictionSnapshot?
    @State private var errorText: String?
    @State private var isLoading = false
    private let provider = DefaultJurisdictionProvider()
    
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    TextField("ZIP (e.g., 55401)", text: $zip)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    Button("Lookup") {
                        Task { await lookup() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(zip.trimmingCharacters(in: .whitespaces).count < 5)
                }
                
                if isLoading {
                    ProgressView().padding(.vertical)
                }
                
                if let s = snapshot {
                    CodesSnapshotView(snapshot: s)
                } else if let errorText {
                    Text(errorText).foregroundStyle(.red)
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Enter a ZIP code to lookup real jurisdiction data:")
                            .font(.footnote).foregroundStyle(.secondary)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Label("Climate Zone (IECC)", systemImage: "thermometer")
                            Label("Wind Speed (ASCE 7-22)", systemImage: "wind")
                            Label("Snow Load (ASCE 7-22)", systemImage: "snowflake")
                            Label("Code Adoptions (ICC)", systemImage: "building.columns")
                            Label("Local Amendments", systemImage: "doc.text")
                        }
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    }
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Codes")
        }
    }
    
    private func lookup() async {
        errorText = nil
        snapshot = nil
        isLoading = true
        defer { isLoading = false }
        
        do {
            snapshot = try await provider.snapshot(forZIP: zip)
        } catch let error as JurisdictionError {
            errorText = error.localizedDescription
        } catch {
            // Generic error - don't expose internal details
            errorText = "Unable to retrieve jurisdiction data. Please try again later."
        }
    }
}

private struct CodesSnapshotView: View {
    let snapshot: JurisdictionSnapshot
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            GroupBox("Jurisdiction") {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(snapshot.city ?? "—"), \(snapshot.state ?? "—") \(snapshot.zip)")
                    Text("Snapshot as of \(DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .short))")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            
            if let c = snapshot.climate {
                GroupBox("Climate") {
                    HStack {
                        Text("IECC Zone: \(c.ieccZone)")
                        Spacer()
                        Text(c.source).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            
            if let h = snapshot.hazards {
                GroupBox("Hazards (ASCE)") {
                    VStack(alignment: .leading) {
                        if let v = h.windVult { Text("Wind Vult: \(Int(v)) mph") }
                        if let s = h.snowPs { Text("Ground Snow: \(Int(s)) psf") }
                        if let ss = h.seismicSs { Text("Seismic Ss: \(ss)") }
                        Text(h.source).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            
            if let a = snapshot.adoptions {
                GroupBox("Adopted Editions") {
                    HStack {
                        Text("IRC \(a.irc ?? "—") • IECC \(a.iecc ?? "—") • NEC \(a.nec ?? "—") • IMC \(a.imc ?? "—") • IPC \(a.ipc ?? "—")")
                        Spacer()
                    }
                    if let notes = a.notes, !notes.isEmpty {
                        Text(notes).font(.footnote)
                    }
                    Text(a.source).font(.footnote).foregroundStyle(.secondary)
                }
            }
            
            if !snapshot.amendments.isEmpty {
                GroupBox("Local Amendments") {
                    ForEach(snapshot.amendments, id: \.self) { amend in
                        VStack(alignment: .leading) {
                            Text(amend.jurisdictionName).bold()
                            Text("\(amend.section): \(amend.summary)")
                            if let u = amend.url {
                                Text(u.absoluteString).font(.footnote).foregroundStyle(.secondary)
                            }
                        }.padding(.vertical, 4)
                    }
                }
            }
            
            Text("Precedence: Local Amendments → State Adoption → Model Code → Standards/Hazards → Manufacturer Listing")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        CodesView()
    }
}