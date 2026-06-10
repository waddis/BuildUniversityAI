import SwiftUI

struct CreateProjectView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var projectNumber = ""
    @State private var customerName = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var postalCode = ""
    @State private var claimNumber = ""
    @State private var damageCategory = ""
    @State private var isLoading = false
    @State private var error: String?

    let onCreated: (Project) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Project") {
                    TextField("Project Name", text: $name)
                    TextField("Project Number", text: $projectNumber)
                }

                Section("Customer") {
                    TextField("Customer Name", text: $customerName)
                }

                Section("Address") {
                    TextField("Street Address", text: $address)
                    TextField("City", text: $city)
                    TextField("State", text: $state)
                    TextField("ZIP Code", text: $postalCode)
                }

                Section("Claim Info") {
                    TextField("Claim Number", text: $claimNumber)
                    Picker("Damage Category", selection: $damageCategory) {
                        Text("Select...").tag("")
                        Text("Hail").tag("Hail")
                        Text("Wind").tag("Wind")
                        Text("Water").tag("Water")
                        Text("Fire").tag("Fire")
                        Text("Other").tag("Other")
                    }
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createProject() }
                        .disabled(name.isEmpty || isLoading)
                        .bold()
                }
            }
        }
    }

    private func createProject() {
        isLoading = true
        error = nil

        Task {
            do {
                let body = CreateProjectBody(
                    name: name,
                    project_number: projectNumber.isEmpty ? nil : projectNumber,
                    customer_name: customerName.isEmpty ? nil : customerName,
                    address_line_1: address.isEmpty ? nil : address,
                    city: city.isEmpty ? nil : city,
                    state: state.isEmpty ? nil : state,
                    postal_code: postalCode.isEmpty ? nil : postalCode,
                    claim_number: claimNumber.isEmpty ? nil : claimNumber,
                    loss_date: nil
                )
                let project = try await ProjectService.create(body)
                onCreated(project)
                dismiss()
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}
