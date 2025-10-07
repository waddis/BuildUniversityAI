import SwiftUI

struct HomeView: View {
    @EnvironmentObject var session: AuthSession
    
    var body: some View {
        NavigationStack {
            List {
                #if DEBUG
                Section {
                    HStack {
                        Image(systemName: "wrench.fill")
                            .foregroundColor(.orange)
                        Text("Development Mode - No Authentication Required")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                #endif
                
                        Section("Learn") {
                            NavigationLink("All Courses", destination: CourseListView(level: "All"))
                            NavigationLink("Beginner Pathway", destination: CourseListView(level: "Beginner"))
                            NavigationLink("Intermediate Skills", destination: CourseListView(level: "Intermediate"))
                            NavigationLink("Advanced CEU", destination: CourseListView(level: "Advanced"))
                        }
                        
                        #if DEBUG
                        Section("Development") {
                            Text("Using Core Data - No Network Required")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        #endif
                
                Section("Field Toolkit") {
                    NavigationLink("Concrete Calculator", destination: ConcreteCalcView())
                    NavigationLink("Roof Pitch", destination: RoofPitchView())
                    NavigationLink("Load Calculator", destination: LoadCalcView())
                    NavigationLink("Safety Checklist", destination: SafetyChecklistView())
                    NavigationLink("Inspection Checklist", destination: InspectionChecklistView())
                }
                
                Section("Progress") {
                    NavigationLink("License Wallet", destination: LicenseWalletView())
                    NavigationLink("CEU Transcript", destination: CEUTranscriptView())
                }
                
                Section("Settings") {
                    NavigationLink("Profile", destination: SettingsView())
                    NavigationLink("Privacy", destination: PrivacyView())
                }
            }
            .navigationTitle("Resolution Academy")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    #if DEBUG
                    Button("Dev Mode") {
                        // In development, just show a message
                        print("Development mode - no sign out needed")
                    }
                    #else
                    Button("Sign Out") {
                        session.signOut()
                    }
                    #endif
                }
            }
        }
    }
}

// Placeholder views for navigation
struct CourseListView: View {
    let level: String
    @State private var courses: [CourseVM] = []
    @State private var isLoading = true
    
    var body: some View {
        List {
            if isLoading {
                HStack {
                    ProgressView()
                    Text("Loading courses...")
                        .foregroundColor(.secondary)
                }
            } else {
                ForEach(courses) { course in
                    NavigationLink(destination: CoursePlayerView(courseId: course.id)) {
                        CourseCardView(course: course)
                    }
                }
            }
        }
        .task { 
            await loadCourses()
        }
        .navigationTitle(level)
        .refreshable {
            await loadCourses()
        }
    }
    
    private func loadCourses() async {
        isLoading = true
        do {
            courses = try await APIClient.shared.get("/courses?level=\(level)")
        } catch {
            print("Failed to load courses from API: \(error)")
            // Fallback to mock data for development
            courses = getMockCourses(for: level)
        }
        isLoading = false
    }
    
    private func getMockCourses(for level: String) -> [CourseVM] {
        let allCourses = [
            CourseVM(
                id: "safety_101",
                title: "Jobsite Safety Orientation",
                category: "Safety & Compliance",
                ceu: 0.1,
                level: "Beginner",
                description: "An essential orientation to workplace safety, identifying common jobsite hazards and personal protective measures.",
                published: true,
                lessons: [
                    LessonVM(id: "lesson_1", title: "Understanding Workplace Hazards", objective: "Identify and classify common workplace hazards according to OSHA standards.", fieldIntegration: "Checklist: Safety Inspection", durationMin: 15, order: 1),
                    LessonVM(id: "lesson_2", title: "Personal Protective Equipment (PPE)", objective: "Select and use appropriate PPE for different jobsite conditions.", fieldIntegration: "Checklist: PPE Verification", durationMin: 20, order: 2)
                ]
            ),
            CourseVM(
                id: "concrete_basics",
                title: "Concrete Basics: Volume & Mix",
                category: "Technical Skills",
                ceu: 0.1,
                level: "Beginner",
                description: "Learn how to calculate concrete volume, account for waste, and select proper mix types for site conditions.",
                published: true,
                lessons: [
                    LessonVM(id: "lesson_1", title: "Volume Calculation Fundamentals", objective: "Apply geometric formulas to determine total cubic yardage.", fieldIntegration: "Calculator: Concrete Volume", durationMin: 25, order: 1),
                    LessonVM(id: "lesson_2", title: "Mix Ratios and Adjustments", objective: "Identify standard mix ratios and when to adjust for conditions.", fieldIntegration: "Field Note: Mix Adjustment Log", durationMin: 20, order: 2)
                ]
            ),
            CourseVM(
                id: "osha_hazcom",
                title: "OSHA Hazard Communication",
                category: "Compliance Training",
                ceu: 0.1,
                level: "Intermediate",
                description: "Covers OSHA's Hazard Communication Standard, GHS labeling, and Safety Data Sheet interpretation.",
                published: true,
                lessons: [
                    LessonVM(id: "lesson_1", title: "Hazard Communication Basics", objective: "Explain the purpose and structure of OSHA's Hazard Communication Standard.", fieldIntegration: "Checklist: Chemical Inventory", durationMin: 30, order: 1),
                    LessonVM(id: "lesson_2", title: "Reading Safety Data Sheets (SDS)", objective: "Interpret key sections of an SDS to identify risks and precautions.", fieldIntegration: "Photo Upload: SDS Label Example", durationMin: 25, order: 2)
                ]
            ),
            CourseVM(
                id: "supervisor_communication",
                title: "Supervisor Communication Skills",
                category: "Leadership & Communication",
                ceu: 0.1,
                level: "Intermediate",
                description: "Develop strong interpersonal and leadership communication skills for effective team management.",
                published: true,
                lessons: [
                    LessonVM(id: "lesson_1", title: "Active Listening & Feedback", objective: "Demonstrate effective active listening and constructive feedback in jobsite settings.", fieldIntegration: "Scenario: Team Meeting Simulation", durationMin: 35, order: 1),
                    LessonVM(id: "lesson_2", title: "Conflict Resolution", objective: "Apply structured problem-solving to manage workplace disagreements.", fieldIntegration: "Checklist: Incident Communication Log", durationMin: 30, order: 2)
                ]
            ),
            CourseVM(
                id: "waste_reduction",
                title: "Waste Reduction & Material Recycling",
                category: "Environmental Responsibility",
                ceu: 0.1,
                level: "Intermediate",
                description: "Learn how to minimize material waste and improve site sustainability through smart resource management.",
                published: true,
                lessons: [
                    LessonVM(id: "lesson_1", title: "Sources of Construction Waste", objective: "Identify key contributors to material waste on job sites.", fieldIntegration: "Checklist: Waste Audit", durationMin: 20, order: 1),
                    LessonVM(id: "lesson_2", title: "Recycling Best Practices", objective: "Implement recycling and reuse strategies aligned with EPA guidelines.", fieldIntegration: "Photo Upload: Recycled Material Bin", durationMin: 25, order: 2)
                ]
            ),
            CourseVM(
                id: "roof_systems_anatomy",
                title: "Understanding Roof Systems — From Deck to Shingle",
                category: "Technical Skills",
                ceu: 0.1,
                level: "Beginner-Intermediate",
                description: "A practical introduction to residential and light‑commercial roof systems, layer by layer. Learn structure, moisture barriers, flashings, coverings, and ventilation with field‑ready terminology and practices.",
                published: true,
                lessons: [
                    LessonVM(id: "roof_anatomy_terms", title: "Roof Anatomy & Terminology", objective: "Identify all major roof components, describe their function, and use correct terminology for estimating and inspection.", fieldIntegration: "Activity: Label layers on a roof cross‑section image", durationMin: 30, order: 1),
                    LessonVM(id: "deck_underlayment", title: "Roof Deck & Underlayment", objective: "Assess deck condition and select/install appropriate underlayment types with correct laps, fastening, and sequencing.", fieldIntegration: "Checklist: Deck condition and underlayment verification", durationMin: 25, order: 2),
                    LessonVM(id: "flashings_penetrations", title: "Flashings and Penetrations", objective: "Differentiate step vs. counter flashing and apply correct sequencing at walls, chimneys, and roof edges to prevent leaks.", fieldIntegration: "Photo audit: Document penetration and flashing elements", durationMin: 20, order: 3),
                    LessonVM(id: "coverings_shingles", title: "Roof Coverings (Shingles & Alternatives)", objective: "Explain shingle composition, classes, wind ratings, and correct fastening/stagger patterns; recognize alternative materials.", fieldIntegration: "Field check: Verify nailing pattern and exposure", durationMin: 25, order: 4),
                    LessonVM(id: "ventilation_moisture", title: "Ventilation & Moisture Control", objective: "Design balanced intake and exhaust ventilation, prevent ice dams, and coordinate insulation and air/vapor control.", fieldIntegration: "Calculator: Intake vs. exhaust net free area", durationMin: 20, order: 5)
                ]
            )
        ]
        
        if level == "All" {
            return allCourses
        } else {
            return allCourses.filter { $0.level == level }
        }
    }
}

struct CourseVM: Identifiable, Codable {
    let id: String
    let title: String
    let category: String
    let ceu: Double
    let level: String
    let description: String
    let published: Bool
    let lessons: [LessonVM]
}

struct LessonVM: Identifiable, Codable {
    let id: String
    let title: String
    let objective: String
    let fieldIntegration: String
    let durationMin: Int
    let order: Int
}

struct LessonPlayerView: View {
    let courseId: String
    let lessonId: String?
    @State private var launch: (token: String, url: URL)?
    @State private var errorMessage: String?
    
    init(courseId: String, lessonId: String? = nil) {
        self.courseId = courseId
        self.lessonId = lessonId
    }
    
    var body: some View {
        VStack {
            if let launch = launch {
                WebView(url: launch.url)
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    
                    Text("Lesson Unavailable")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("This lesson is not available in development mode. The backend server is not running.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding()
                    
                    Text("Error: \(error)")
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                    
                    Button("Retry") {
                        loadLesson()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else {
                ProgressView("Loading lesson...")
            }
        }
        .navigationTitle("Lesson")
        .task {
            loadLesson()
        }
    }
    
    private func loadLesson() {
        Task {
            do {
                #if DEBUG
                // Use mock service in development
                let (token, url) = try await MockLMSService.shared.launchLesson(courseId: courseId, lessonId: lessonId)
                await MainActor.run {
                    self.launch = (token, url)
                }
                #else
                // Use real API in production
                struct LaunchRes: Decodable { 
                    let token: String
                    let launchUrl: String 
                }
                let res: LaunchRes = try await APIClient.shared.post(
                    "/lms/launch", 
                    body: ["courseId": courseId]
                )
                await MainActor.run {
                    self.launch = (res.token, URL(string: res.launchUrl)!)
                }
                #endif
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load lesson: \(error.localizedDescription)"
                }
            }
        }
    }
}

