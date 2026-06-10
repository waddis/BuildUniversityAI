import SwiftUI
import AVFoundation

struct FieldCameraView: View {
    @StateObject private var camera = CameraManager()
    @Environment(\.dismiss) private var dismiss
    @State private var showBatchReview = false
    let projectId: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Camera preview
            #if targetEnvironment(simulator)
            ZStack {
                LinearGradient(colors: [.gray.opacity(0.3), .gray.opacity(0.1)], startPoint: .top, endPoint: .bottom)
                VStack(spacing: 8) {
                    Image(systemName: "camera.badge.ellipsis")
                        .font(.system(size: 40))
                        .foregroundStyle(.white.opacity(0.4))
                    Text("Camera Preview")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.3))
                    Text("(Simulator)")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.2))
                }
            }
            .ignoresSafeArea()
            #else
            CameraPreviewLayer(session: camera.session)
                .ignoresSafeArea()
            #endif

            // Controls overlay
            VStack {
                // Top bar
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.title3)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }

                    Spacer()

                    // Flash toggle
                    Button { camera.toggleFlash() } label: {
                        Image(systemName: camera.flashIcon)
                            .font(.title3)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }

                    // Mode toggle
                    Button {
                        camera.captureMode = camera.captureMode == .photo ? .video : .photo
                    } label: {
                        Image(systemName: camera.captureMode == .photo ? "camera" : "video")
                            .font(.title3)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)

                Spacer()

                // Capture count badge
                if !camera.capturedPhotos.isEmpty {
                    HStack {
                        Spacer()
                        Button { showBatchReview = true } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "photo.stack")
                                Text("\(camera.capturedPhotos.count)")
                                    .fontWeight(.semibold)
                            }
                            .font(.callout)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.brandPrimary, in: Capsule())
                        }
                        .padding(.trailing)
                    }
                    .padding(.bottom, 8)
                }

                // Bottom bar
                HStack(alignment: .center, spacing: 40) {
                    // Thumbnail of last capture
                    if let last = camera.capturedPhotos.last, let img = last.image {
                        Image(uiImage: img)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 50, height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.white.opacity(0.2))
                            .frame(width: 50, height: 50)
                    }

                    // Shutter button
                    Button {
                        if camera.captureMode == .photo {
                            #if targetEnvironment(simulator)
                            // Create a sample image on simulator
                            let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 300))
                            let img = renderer.image { ctx in
                                UIColor.systemGray5.setFill()
                                ctx.fill(CGRect(x: 0, y: 0, width: 400, height: 300))
                                let text = "Simulator Photo \(camera.capturedPhotos.count + 1)" as NSString
                                let attrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 20), .foregroundColor: UIColor.darkGray]
                                text.draw(at: CGPoint(x: 100, y: 130), withAttributes: attrs)
                            }
                            camera.addCapturedMedia(image: img)
                            #else
                            Task {
                                if let image = await camera.capturePhoto() {
                                    camera.addCapturedMedia(image: image)
                                }
                            }
                            #endif
                        } else {
                            if camera.isRecording {
                                camera.stopVideoRecording()
                            } else {
                                camera.startVideoRecording()
                            }
                        }
                    } label: {
                        ZStack {
                            Circle()
                                .strokeBorder(.white, lineWidth: 4)
                                .frame(width: 72, height: 72)
                            Circle()
                                .fill(camera.isRecording ? .red : .white)
                                .frame(width: camera.isRecording ? 32 : 60, height: camera.isRecording ? 32 : 60)
                                .animation(.easeInOut(duration: 0.2), value: camera.isRecording)
                        }
                    }

                    // Done button
                    Button {
                        if camera.capturedPhotos.isEmpty {
                            dismiss()
                        } else {
                            showBatchReview = true
                        }
                    } label: {
                        Text("Done")
                            .font(.callout.bold())
                            .foregroundStyle(.white)
                            .frame(width: 50)
                    }
                }
                .padding(.bottom, 30)
            }
        }
        .onAppear {
            camera.setupSession()
            camera.startSession()
        }
        .onDisappear {
            camera.stopSession()
        }
        .sheet(isPresented: $showBatchReview) {
            BatchReviewView(
                captures: camera.capturedPhotos,
                projectId: projectId,
                onComplete: {
                    camera.clearCaptures()
                    dismiss()
                }
            )
        }
    }
}

struct CameraPreviewLayer: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        context.coordinator.previewLayer = previewLayer
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.previewLayer?.frame = uiView.bounds
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator {
        var previewLayer: AVCaptureVideoPreviewLayer?
    }
}
