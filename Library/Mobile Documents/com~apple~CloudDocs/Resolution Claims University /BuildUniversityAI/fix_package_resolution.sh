#!/bin/bash

# BuildUniversityAI Package Resolution Fix Script
# Run this script to cleanly re-add the ConstructionCore package

echo "🔧 BuildUniversityAI Package Resolution Fix"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "ConstructionCore/Package.swift" ]; then
    echo "❌ Error: ConstructionCore/Package.swift not found"
    echo "   Make sure you're in the BuildUniversityAI directory"
    exit 1
fi

echo "✅ Found ConstructionCore package at correct location"

# Check workspace file
if [ ! -f "BuildUniversityAI.xcworkspace/contents.xcworkspacedata" ]; then
    echo "❌ Error: BuildUniversityAI.xcworkspace not found"
    exit 1
fi

echo "✅ Found BuildUniversityAI workspace"

# Check project file
if [ ! -f "BuildUniversityAI.xcodeproj/project.pbxproj" ]; then
    echo "❌ Error: BuildUniversityAI.xcodeproj not found"
    exit 1
fi

echo "✅ Found BuildUniversityAI project"

echo ""
echo "📋 Manual Steps Required in Xcode:"
echo "================================="
echo "1. Open BuildUniversityAI.xcworkspace in Xcode"
echo "2. In Project Navigator, right-click 'ConstructionCore' package"
echo "3. Select 'Remove Package' (this removes the reference, not files)"
echo "4. Go to File → Add Packages..."
echo "5. Click 'Add Local...' button"
echo "6. Navigate to and select the 'ConstructionCore' folder"
echo "7. Click 'Add Package'"
echo "8. When prompted, check ALL products:"
echo "   ✅ CoreModels"
echo "   ✅ Lessons" 
echo "   ✅ Jurisdiction"
echo "   ✅ SharedUI"
echo "   ✅ ARShared"
echo "9. Click 'Add Package'"
echo "10. Verify in BuildUniversityAI target → Frameworks, Libraries & Embedded Content"
echo "    that all 5 products appear with status 'Do Not Embed'"
echo ""
echo "🔄 Then run these Xcode commands:"
echo "   File → Packages → Reset Package Caches"
echo "   Product → Clean Build Folder"
echo "   Quit Xcode completely"
echo "   Re-open BuildUniversityAI.xcworkspace"
echo "   Build (⌘B)"
echo ""
echo "✅ This should resolve all 'Unable to find module dependency' errors"

