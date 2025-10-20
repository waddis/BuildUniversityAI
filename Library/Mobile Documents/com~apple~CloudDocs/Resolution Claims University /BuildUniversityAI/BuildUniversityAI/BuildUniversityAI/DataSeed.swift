import Foundation

// ---- Enhanced Contracts ----
public enum MediaKind: String, Codable { 
    case imageAsset, remoteImage, usdzAsset 
}

public struct Media: Identifiable, Codable, Hashable {
    public let id: String
    public let kind: MediaKind
    public let nameOrURL: String   // asset name (for image/usdz) or https URL
    public let caption: String?
}

public struct Lesson: Identifiable, Codable, Hashable {   // <— add Hashable
    public let id: String
    public let title: String
    public let summary: String
    public let steps: [LessonStep]
    public let citations: [Citation]
}

public struct LessonStep: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let body: String
    public let media: [Media]      // <— was mediaURL
    public let citations: [Citation]
}

public struct Citation: Codable, Hashable {
    public let source: String        // e.g., "NEC"
    public let section: String?      // e.g., "210.8(A)"
    public let url: URL?             // official or publisher page
    public let publisher: String     // e.g., "NFPA"
    public let year: String          // e.g., "2023"
}

// ---- Expanded "facts-only" seed (renders immediately) ----
enum SeedData {
    static let lessons: [Lesson] = [
        // ---- Existing #1: NEC GFCI ----
        Lesson(
            id: "nec-gfci-210-8a",
            title: "NEC GFCI Locations (Dwelling Units)",
            summary: "Where GFCI protection is required in homes per NEC 210.8(A).",
            steps: [
                LessonStep(
                    id: "gfci-scope",
                    title: "Scope",
                    body: "GFCI protection is required for all 125–250V receptacles in specified dwelling locations.",
                    media: [
                        Media(id: "m-gfci-01", kind: .imageAsset, nameOrURL: "gfci_outlet", caption: "Typical 15/20A duplex GFCI"),
                    ],
                    citations: [
                        Citation(source: "NEC", section: "210.8(A)", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
                    ]
                ),
                LessonStep(
                    id: "gfci-locations",
                    title: "Required Locations",
                    body: "Bathrooms; garages/accessory buildings; outdoors; crawl spaces; unfinished basements; kitchens for countertop surfaces; sinks (within 6 ft of the outside edge); boathouses; bathtubs or shower stalls (within 6 ft); laundry areas.",
                    media: [
                        Media(id: "m-gfci-02", kind: .remoteImage, nameOrURL: "https://example.org/img/gfci_kitchen_counter.jpg", caption: "Countertop receptacles require GFCI"),
                    ],
                    citations: [
                        Citation(source: "NEC", section: "210.8(A)(1)–(10)", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
                    ]
                )
            ],
            citations: [
                Citation(source: "NEC", section: "210.8(A)", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
            ]
        ),

        // ---- Existing #2: IRC Smoke Alarms ----
        Lesson(
            id: "irc-smoke-alarms-r314",
            title: "Smoke Alarms – Locations & Interconnection",
            summary: "Minimum smoke alarm locations and interconnection for one- and two-family dwellings.",
            steps: [
                LessonStep(
                    id: "smoke-locations",
                    title: "Required Locations",
                    body: "In each sleeping room; outside each separate sleeping area; on each additional story including basements.",
                    media: [
                        Media(id: "m-smk-01", kind: .imageAsset, nameOrURL: "smoke_alarm", caption: "Listed smoke alarm"),
                    ],
                    citations: [
                        Citation(source: "IRC", section: "R314.3", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
                    ]
                ),
                LessonStep(
                    id: "interconnection",
                    title: "Power & Interconnection",
                    body: "Primary power from building wiring with battery backup; interconnect so activation of one triggers all.",
                    media: [],
                    citations: [
                        Citation(source: "IRC", section: "R314.4–R314.6", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
                    ]
                )
            ],
            citations: [
                Citation(source: "IRC", section: "R314", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
            ]
        ),

        // ---- NEW #3: NEC AFCI ----
        Lesson(
            id: "nec-afci-210-12",
            title: "NEC AFCI Requirements (Dwelling Units)",
            summary: "Where arc-fault circuit interrupter protection is required per NEC 210.12.",
            steps: [
                LessonStep(
                    id: "afci-scope",
                    title: "Scope & Devices",
                    body: "AFCI protection required for 120V, single-phase, 15- and 20-ampere branch circuits supplying outlets or devices in specified rooms/areas.",
                    media: [
                        Media(id: "m-afci-01", kind: .imageAsset, nameOrURL: "afci_breaker", caption: "Combination-type AFCI circuit breaker"),
                        Media(id: "m-afci-02", kind: .usdzAsset,  nameOrURL: "afci_panel",  caption: "3D: Panel with AFCI breakers (.usdz)"),
                        Media(id: "m-afci-03", kind: .usdzAsset,  nameOrURL: "https://example.org/models/electrical_meter_base.usdz", caption: "Remote: Meter base assembly (cached after first view)"),
                    ],
                    citations: [
                        Citation(source: "NEC", section: "210.12", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
                    ]
                ),
                LessonStep(
                    id: "afci-locations",
                    title: "Required Locations",
                    body: "Typically includes kitchens, family rooms, dining rooms, living rooms, parlors, libraries, dens, bedrooms, sunrooms, recreation rooms, closets, hallways, laundry areas, and similar rooms/areas.",
                    media: [],
                    citations: [
                        Citation(source: "NEC", section: "210.12(A)", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
                    ]
                )
            ],
            citations: [
                Citation(source: "NEC", section: "210.12", url: URL(string:"https://www.nfpa.org/NEC"), publisher: "NFPA", year: "2023")
            ]
        ),

        // ---- NEW #4: IRC CO Alarms ----
        Lesson(
            id: "irc-co-alarms-r315",
            title: "Carbon Monoxide Alarms – Locations & Power",
            summary: "Where CO alarms are required and how they're powered.",
            steps: [
                LessonStep(
                    id: "co-where",
                    title: "Required Locations",
                    body: "Outside of each separate sleeping area in the immediate vicinity of the bedrooms in dwelling units with fuel-fired appliances or attached garages.",
                    media: [
                        Media(id: "m-co-01", kind: .imageAsset, nameOrURL: "co_alarm", caption: "Listed CO alarm"),
                    ],
                    citations: [
                        Citation(source: "IRC", section: "R315.3", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
                    ]
                ),
                LessonStep(
                    id: "co-power",
                    title: "Power & Combination Units",
                    body: "CO alarms shall be hard-wired with battery backup or battery powered where permitted; combination smoke/CO units allowed when listed for both.",
                    media: [],
                    citations: [
                        Citation(source: "IRC", section: "R315.5, R315.7", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
                    ]
                )
            ],
            citations: [
                Citation(source: "IRC", section: "R315", url: URL(string:"https://codes.iccsafe.org/"), publisher: "ICC", year: "2021")
            ]
        )
    ]
}