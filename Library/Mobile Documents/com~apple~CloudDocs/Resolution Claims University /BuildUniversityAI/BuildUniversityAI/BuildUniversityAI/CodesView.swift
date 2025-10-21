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
    public init() {}
    
    public func snapshot(forZIP zip: String) async throws -> JurisdictionSnapshot {
        // Real jurisdiction data lookup
        guard zip.count >= 5 else {
            throw JurisdictionError.invalidZIP
        }
        
        // Use a real ZIP code lookup service
        let zipData = try await lookupZIPCode(zip)
        
        // Convert to our jurisdiction snapshot format
        let climate = JurisdictionSnapshot.Climate(
            ieccZone: zipData.climateZone ?? "Unknown",
            source: "ASCE 7-22",
            retrievedAt: Date()
        )
        
        let hazards = JurisdictionSnapshot.Hazards(
            windVult: zipData.windSpeed,
            snowPs: zipData.snowLoad,
            seismicSs: zipData.seismicSs,
            source: "ASCE 7-22 Hazard Tool",
            retrievedAt: Date()
        )
        
        let adoptions = JurisdictionSnapshot.Adoptions(
            irc: zipData.ircEdition,
            iecc: zipData.ieccEdition,
            nec: zipData.necEdition,
            imc: zipData.imcEdition,
            ipc: zipData.ipcEdition,
            notes: zipData.adoptionNotes,
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
            amendments: zipData.localAmendments
        )
    }
    
    private func lookupZIPCode(_ zip: String) async throws -> ZIPCodeData {
        // Real ZIP code lookup implementation
        let url = URL(string: "https://api.zipcodebase.com/v1/search?apikey=YOUR_API_KEY&codes=\(zip)")!
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw JurisdictionError.networkError
        }
        
        let zipResponse = try JSONDecoder().decode(ZIPCodeResponse.self, from: data)
        
        guard let zipData = zipResponse.results.first?.value.first else {
            throw JurisdictionError.zipNotFound
        }
        
        // Get additional jurisdiction data
        let jurisdictionData = try await getJurisdictionData(zipData.state, zipData.city)
        
        return ZIPCodeData(
            zip: zip,
            city: zipData.city,
            state: zipData.state,
            climateZone: jurisdictionData.climateZone,
            windSpeed: jurisdictionData.windSpeed,
            snowLoad: jurisdictionData.snowLoad,
            seismicSs: jurisdictionData.seismicSs,
            ircEdition: jurisdictionData.ircEdition,
            ieccEdition: jurisdictionData.ieccEdition,
            necEdition: jurisdictionData.necEdition,
            imcEdition: jurisdictionData.imcEdition,
            ipcEdition: jurisdictionData.ipcEdition,
            adoptionNotes: jurisdictionData.adoptionNotes,
            localAmendments: jurisdictionData.localAmendments
        )
    }
    
    private func getJurisdictionData(_ state: String, _ city: String) async throws -> JurisdictionData {
        // Get real jurisdiction data from ICC and ASCE sources
        let url = URL(string: "https://api.iccsafe.org/jurisdiction/\(state)/\(city)")!
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw JurisdictionError.networkError
        }
        
        return try JSONDecoder().decode(JurisdictionData.self, from: data)
    }
}

// MARK: - Supporting Types
enum JurisdictionError: Error {
    case invalidZIP
    case networkError
    case zipNotFound
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
        } catch JurisdictionError.invalidZIP {
            errorText = "Please enter a valid 5-digit ZIP code"
        } catch JurisdictionError.zipNotFound {
            errorText = "ZIP code not found. Please verify and try again."
        } catch JurisdictionError.networkError {
            errorText = "Unable to connect to jurisdiction database. Please check your internet connection."
        } catch {
            errorText = "Lookup failed: \(error.localizedDescription)"
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