// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ConstructionCore",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(name: "CoreModels", targets: ["CoreModels"]),
        .library(name: "Lessons", targets: ["Lessons"]),
        .library(name: "Jurisdiction", targets: ["Jurisdiction"]),
        .library(name: "SharedUI", targets: ["SharedUI"]),
        .library(name: "ARShared", targets: ["ARShared"])
    ],
    targets: [
        .target(
            name: "CoreModels",
            path: "Sources/CoreModels"
        ),
        .target(
            name: "Lessons",
            dependencies: ["CoreModels"],
            resources: [.process("Resources")],
            path: "Sources/Lessons"
        ),
        .target(
            name: "Jurisdiction",
            path: "Sources/Jurisdiction"
        ),
        .target(
            name: "SharedUI",
            dependencies: ["CoreModels"],
            path: "Sources/SharedUI"
        ),
        .target(
            name: "ARShared",
            dependencies: ["CoreModels", "SharedUI"],
            path: "Sources/ARShared"
        ),
        .testTarget(
            name: "ConstructionCoreTests",
            dependencies: ["Lessons"],
            path: "Tests/ConstructionCoreTests"
        )
    ]
)