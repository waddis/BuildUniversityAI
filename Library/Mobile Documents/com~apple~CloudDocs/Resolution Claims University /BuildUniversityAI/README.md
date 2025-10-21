# BuildUniversityAI

An iPad-first iOS application for construction education with AR-powered lessons.

## Project Structure

### iOS App Target
- **Name**: BuildUniversityAI
- **Bundle ID**: ai.twelvesquared.builduniversity
- **Minimum Deployment**: iPadOS 17
- **Devices**: iPad only
- **Frameworks**: ARKit, RealityKit (linked only, no template boilerplate)

### Build Configurations
- **Debug**: Development environment with debug API endpoints
- **Staging**: Pre-production testing environment
- **Release**: Production environment

Configuration files are located in `BuildUniversityAI/Config/`:
- `Debug.xcconfig`
- `Staging.xcconfig`
- `Release.xcconfig`

Each configuration includes:
- `API_BASE_URL`: Backend API endpoint
- `FEATURE_FLAGS_JSON`: Feature toggles
- `APP_DISPLAY_NAME`: App display name for each environment

### Swift Package: ConstructionCore

A local Swift Package containing shared logic and resources with five targets:

#### 1. CoreModels
Core data types with no external dependencies:
- `CodeFamily`: Enum for code families (IRC, IECC, NEC, etc.)
- `CodeReference`: Code reference with family, edition, section, title
- `LessonStep`: Individual lesson step with animation keys and code refs
- `Lesson`: Complete lesson with system, module, steps

#### 2. Lessons
Lesson loading and management (depends on CoreModels):
- `LessonStore`: Singleton for loading lessons from package resources
- Resources bundle with:
  - `index.json`: List of available lesson IDs
  - `roof_asphalt_shingle.json`: Sample lesson with 7 steps

#### 3. Jurisdiction
Jurisdiction data and code adoptions (no external dependencies):
- `JurisdictionSnapshot`: Complete jurisdiction data including climate, hazards, code adoptions, amendments
- `JurisdictionProvider`: Protocol for jurisdiction data providers
- `DefaultJurisdictionProvider`: Mock implementation returning deterministic data

#### 4. SharedUI
Reusable SwiftUI components (depends on CoreModels):
- `CodeChip`: SwiftUI view for displaying code references with family badge, edition, and section

#### 5. ARShared
AR scene management (depends on CoreModels):
- `ARSceneHost`: Observable object for managing AR scenes, layers, and animations
- `ARLessonView`: SwiftUI view placeholder for AR lesson experiences

### App Features

The app includes a TabView with five tabs:

#### 1. Learn
- Lists available lessons from `LessonStore`
- Tap to view lesson details
- "Start Lesson" button shows AR experience

#### 2. Explore
- Placeholder for exploring construction systems and materials

#### 3. Codes
- ZIP code lookup for jurisdiction information
- Displays climate zone, hazards, code adoptions
- Uses `DefaultJurisdictionProvider` for mock data

#### 4. Library
- Placeholder for downloaded content bundles

#### 5. Profile
- Accessibility settings:
  - Motion Reduction toggle
  - Large Tap Targets toggle
- "Reset App Data" button (stub)

### Accessibility & Settings

Settings model using `@Observable`:
- `motionReduction`: Boolean for reducing motion animations
- `largeTapTargets`: Boolean for larger tap target sizes

### Tests

#### Package Tests (`ConstructionCoreTests`)
- JSON encoding/decoding tests for all model types
- `LessonStore` resource loading tests
- Jurisdiction mock snapshot tests

#### UI Tests (`BuildUniversityAIUITests`)
- Launch test
- Navigate to Learn tab
- Open first lesson detail
- Verify "Start Lesson" button

## Getting Started

1. Open `BuildUniversityAI.xcworkspace` in Xcode
2. Select the BuildUniversityAI scheme
3. Choose an iPad simulator (iPadOS 17+)
4. Build and run

## Requirements

- Xcode 15.0+
- iOS 17.0+ / iPadOS 17.0+
- Swift 5.9+

## License

Copyright © 2025 Twelve Squared AI. All rights reserved.

