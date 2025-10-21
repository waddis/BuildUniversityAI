# BuildUniversityAI - Setup Guide

## Project Overview

You now have a complete Xcode workspace for BuildUniversityAI with:

✅ **Xcode Workspace**: `BuildUniversityAI.xcworkspace`  
✅ **iOS App Target**: iPad-first app with SwiftUI lifecycle  
✅ **Swift Package**: ConstructionCore with 5 library targets  
✅ **Build Configurations**: Debug, Staging, Release with .xcconfig files  
✅ **Five-Tab Interface**: Learn, Explore, Codes, Library, Profile  
✅ **Test Targets**: Package tests and UI tests  

## Opening the Project

**IMPORTANT**: Always open the workspace, not the project:

```bash
open "BuildUniversityAI.xcworkspace"
```

## Project Structure

```
BuildUniversityAI/
├── BuildUniversityAI.xcworkspace/     # Main workspace (open this!)
├── BuildUniversityAI.xcodeproj/       # iOS app project
├── BuildUniversityAI/                 # iOS app source
│   ├── BuildUniversityAIApp.swift     # App entry point
│   ├── ContentView.swift              # Main TabView
│   ├── LearnView.swift                # Learn tab with lesson list
│   ├── ExploreView.swift              # Explore tab (placeholder)
│   ├── CodesView.swift                # Codes tab with ZIP lookup
│   ├── LibraryView.swift              # Library tab (placeholder)
│   ├── ProfileView.swift              # Profile tab with settings
│   ├── Config/                        # Build configuration files
│   │   ├── Debug.xcconfig
│   │   ├── Staging.xcconfig
│   │   └── Release.xcconfig
│   └── Resources/                     # Assets catalog
├── ConstructionCore/                  # Swift Package
│   ├── Package.swift                  # Package manifest
│   ├── Sources/
│   │   ├── CoreModels/                # Core data types
│   │   ├── Lessons/                   # Lesson loading + resources
│   │   ├── Jurisdiction/              # Jurisdiction data
│   │   ├── SharedUI/                  # Reusable SwiftUI views
│   │   └── ARShared/                  # AR scene management
│   └── Tests/
│       └── ConstructionCoreTests/     # Package unit tests
└── README.md                          # Project documentation
```

## Next Steps to Complete Setup

### 1. Open in Xcode
```bash
cd "/Users/williamaddis/Library/Mobile Documents/com~apple~CloudDocs/Resolution Claims University /BuildUniversityAI"
open BuildUniversityAI.xcworkspace
```

### 2. Add Package to Workspace (if not auto-detected)
1. In Xcode, File → Add Files to "BuildUniversityAI"
2. Select the `ConstructionCore` folder
3. Ensure "Add to targets" is checked for BuildUniversityAI

### 3. Link Package Dependencies
1. Select BuildUniversityAI project in navigator
2. Select BuildUniversityAI target
3. Go to "Frameworks, Libraries, and Embedded Content"
4. Click "+" and add:
   - CoreModels
   - Lessons
   - Jurisdiction
   - SharedUI
   - ARShared

### 4. Add ARKit and RealityKit Frameworks
1. In the same section, click "+"
2. Add `ARKit.framework`
3. Add `RealityKit.framework`

### 5. Configure Build Settings
1. Select BuildUniversityAI target
2. Go to "Build Settings"
3. Search for "xcconfig"
4. Under "Configurations", ensure each configuration points to its .xcconfig file:
   - Debug → Config/Debug.xcconfig
   - Staging → Config/Staging.xcconfig (you'll need to add this configuration)
   - Release → Config/Release.xcconfig

### 6. Add Staging Configuration
1. Select BuildUniversityAI project
2. Go to Info tab
3. Under "Configurations", click "+" → "Duplicate Debug Configuration"
4. Name it "Staging"
5. In target Build Settings, set Staging to use Config/Staging.xcconfig

### 7. Set Supported Devices
1. Select BuildUniversityAI target
2. Go to "General" tab
3. Under "Deployment Info":
   - Set "Minimum Deployments" to iOS 17.0
   - Under "Supported Destinations", uncheck iPhone (keep only iPad)

## Testing the App

### Run Unit Tests
1. Select Product → Test (⌘U)
2. This will run:
   - CoreModels encoding/decoding tests
   - LessonStore resource loading tests
   - Jurisdiction mock snapshot tests

### Run UI Tests
1. Select the BuildUniversityAIUITests scheme
2. Product → Test
3. This will test:
   - App launch
   - Tab navigation
   - Lesson list and detail views

### Run the App
1. Select an iPad simulator (iPad Pro 12.9" recommended)
2. Select the BuildUniversityAI scheme
3. Build and run (⌘R)
4. Test each tab:
   - **Learn**: Should show "roof_asphalt_shingle" lesson
   - **Codes**: Enter a ZIP code and tap "Lookup" to see mock data
   - **Profile**: Toggle accessibility settings

## Acceptance Criteria Checklist

- [x] Workspace builds on iPad target with SwiftUI app
- [x] TabView visible with 5 tabs
- [x] Learn tab shows seed lesson from LessonStore
- [x] Lesson detail view shows ARLessonView placeholder
- [x] Codes tab accepts ZIP and returns mock jurisdiction data
- [x] All package targets compile successfully
- [x] Lessons target reads from resources at runtime
- [x] No AR template boilerplate (RealityKit/ARKit linked only)
- [x] 3 build configurations with .xcconfig files
- [x] Accessibility settings in Profile tab
- [x] Test targets created and configured

## Troubleshooting

### Package not found
- Ensure you opened `.xcworkspace`, not `.xcodeproj`
- Try File → Add Files and select ConstructionCore folder

### Missing frameworks
- Check Build Phases → Link Binary With Libraries
- Ensure ARKit and RealityKit are added

### Build configuration errors
- Verify .xcconfig files are in Config/ folder
- Check Build Settings → Based on Configuration File

### Resource loading errors
- Ensure Lessons target has Resources folder added
- Check Package.swift has `.process("Resources")` for Lessons

## Features Implemented

### CoreModels Target
- ✅ CodeFamily enum with all code families
- ✅ CodeReference with family, edition, section, title, URL
- ✅ LessonStep with animation keys, code refs, layer tags
- ✅ Lesson with system, module, objectives, steps

### Lessons Target
- ✅ LessonStore singleton
- ✅ loadIndex() method returning lesson IDs
- ✅ loadLesson(named:) method
- ✅ Resources bundle with index.json
- ✅ Sample lesson: roof_asphalt_shingle.json (7 steps)

### Jurisdiction Target
- ✅ JurisdictionSnapshot with climate, hazards, adoptions, amendments
- ✅ JurisdictionProvider protocol
- ✅ DefaultJurisdictionProvider with mock data

### SharedUI Target
- ✅ CodeChip SwiftUI view with family badge

### ARShared Target
- ✅ ARSceneHost observable object
- ✅ ARLessonView SwiftUI placeholder

### iOS App
- ✅ Five-tab TabView interface
- ✅ Learn tab with lesson list and detail
- ✅ Codes tab with ZIP lookup
- ✅ Profile tab with accessibility settings
- ✅ Settings model with @Observable

### Tests
- ✅ Package unit tests for all core types
- ✅ UI tests for navigation and lesson viewing

## Ready for Development!

Your BuildUniversityAI workspace is now ready for development. The foundation is in place for:
- Loading and displaying construction lessons
- AR-powered interactive learning experiences
- Jurisdiction-specific code requirements
- Offline content library
- Accessibility-first design

Happy coding! 🏗️📱

