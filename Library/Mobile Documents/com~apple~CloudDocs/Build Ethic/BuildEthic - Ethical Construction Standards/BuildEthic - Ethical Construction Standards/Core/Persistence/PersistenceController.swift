import CoreData

struct PersistenceController {
    static let shared = PersistenceController()
    let container: NSPersistentContainer
    
    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "ResolutionAcademy")
        if inMemory { 
            container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null") 
        }
        container.loadPersistentStores { _, error in 
            if let error = error { 
                print("Core Data load error: \(error)")
                // Don't crash in development, just log the error
            } 
        }
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }
    
    // Simplified version without Core Data for now
    func importSeedData() {
        print("Seed data import not implemented yet - using mock data")
    }
}

