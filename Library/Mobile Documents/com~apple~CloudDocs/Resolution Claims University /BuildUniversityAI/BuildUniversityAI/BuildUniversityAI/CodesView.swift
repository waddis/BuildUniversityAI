import SwiftUI

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
                    Text("Enter a ZIP to see climate zone, hazards, adopted editions, and amendments.")
                        .font(.footnote).foregroundStyle(.secondary)
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