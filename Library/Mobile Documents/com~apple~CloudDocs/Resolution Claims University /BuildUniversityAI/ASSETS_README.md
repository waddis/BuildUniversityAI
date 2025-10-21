# BuildUniversityAI - Asset Requirements

## Required Assets for Full Functionality

### Images (Add to Assets.xcassets)
- `gfci_outlet` - Typical 15/20A duplex GFCI outlet
- `smoke_alarm` - Listed smoke alarm device
- `afci_breaker` - Combination-type AFCI circuit breaker
- `co_alarm` - Listed CO alarm device

### 3D Models (Add to project root with Target Membership ✅)
- `afci_panel.usdz` - 3D electrical panel with AFCI breakers

### Remote 3D Models (Optional)
- Any USDZ models hosted on CDN/remote servers
- Automatically cached for offline viewing after first download
- Example: `https://example.org/models/electrical_meter_base.usdz`

## Asset Behavior

### Image Assets
- If present: Displays in lesson steps with captions
- If missing: Shows "Image asset missing" placeholder with dashed border

### 3D Models (USDZ)
- **Bundled Models**: Shows RealityKit thumbnail + "View 3D Model" button
- **Remote Models**: Shows "Open 3D Model" button with download/cache capability
- **Quick Look Integration**: Full AR/3D interaction with pinch/rotate/place
- **Caching**: Remote models cached locally for offline viewing
- **Error Handling**: Clear error messages for missing or invalid models

### Remote Images
- Loads asynchronously with progress indicator
- Falls back to "Remote image URL missing" if URL is invalid

## Enhanced 3D Model Features

### ModelViewerButton Component
- **Thumbnail Preview**: RealityKit renders bundled USDZ models as thumbnails
- **AR Integration**: Tap to open in AR Quick Look with full interaction
- **Remote Support**: Downloads and caches remote USDZ models
- **Loading States**: Progress indicators during download/loading
- **Error Handling**: Clear error messages for failed loads

### Caching System
- **Automatic Caching**: Remote models cached in app's cache directory
- **Offline Access**: Cached models available without network
- **Cache Management**: Automatic cleanup and storage management
- **Performance**: Instant loading for previously downloaded models

## Lessons Included

1. **NEC GFCI Locations (Dwelling Units)** - NEC 210.8(A)
2. **Smoke Alarms – Locations & Interconnection** - IRC R314
3. **NEC AFCI Requirements (Dwelling Units)** - NEC 210.12
   - Includes bundled `afci_panel.usdz` + remote meter base example
4. **Carbon Monoxide Alarms – Locations & Power** - IRC R315

All lessons include proper citations linking to official NFPA and ICC sources.
