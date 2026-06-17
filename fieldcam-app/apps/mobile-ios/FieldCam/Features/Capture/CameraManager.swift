import AVFoundation
import UIKit
import CoreLocation

@MainActor
final class CameraManager: NSObject, ObservableObject {
    @Published var isSessionRunning = false
    @Published var flashMode: AVCaptureDevice.FlashMode = .auto
    @Published var captureMode: CaptureMode = .photo
    @Published var capturedPhotos: [CapturedMedia] = []
    @Published var isRecording = false
    @Published var error: String?

    enum CaptureMode: String, CaseIterable {
        case photo = "Photo"
        case video = "Video"
    }

    let session = AVCaptureSession()
    private var photoOutput = AVCapturePhotoOutput()
    private var videoOutput = AVCaptureMovieFileOutput()
    private var currentDevice: AVCaptureDevice?
    private let locationManager = CLLocationManager()
    private var currentLocation: CLLocation?
    private var photoContinuation: CheckedContinuation<UIImage?, Never>?

    override init() {
        super.init()
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
    }

    var isSimulator: Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    func setupSession() {
        guard !isSimulator else {
            isSessionRunning = true
            return
        }

        session.beginConfiguration()
        session.sessionPreset = .photo

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            error = "No camera available"
            return
        }
        currentDevice = device

        do {
            let input = try AVCaptureDeviceInput(device: device)
            if session.canAddInput(input) { session.addInput(input) }
        } catch {
            self.error = "Cannot access camera: \(error.localizedDescription)"
            return
        }

        if let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice),
           session.canAddInput(audioInput) {
            session.addInput(audioInput)
        }

        if session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
            photoOutput.isHighResolutionCaptureEnabled = true
        }

        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
        }

        session.commitConfiguration()
    }

    func startSession() {
        guard !isSimulator, !session.isRunning else { return }
        Task.detached { [weak self] in
            self?.session.startRunning()
            await MainActor.run {
                self?.isSessionRunning = true
            }
        }
    }

    func stopSession() {
        guard session.isRunning else { return }
        Task.detached { [weak self] in
            self?.session.stopRunning()
            await MainActor.run {
                self?.isSessionRunning = false
            }
        }
    }

    func capturePhoto() async -> UIImage? {
        return await withCheckedContinuation { continuation in
            self.photoContinuation = continuation
            let settings = AVCapturePhotoSettings()
            if let device = currentDevice, device.hasFlash {
                settings.flashMode = flashMode
            }
            photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    func toggleFlash() {
        switch flashMode {
        case .auto: flashMode = .on
        case .on: flashMode = .off
        case .off: flashMode = .auto
        @unknown default: flashMode = .auto
        }
    }

    var flashIcon: String {
        switch flashMode {
        case .auto: return "bolt.badge.automatic"
        case .on: return "bolt.fill"
        case .off: return "bolt.slash"
        @unknown default: return "bolt.badge.automatic"
        }
    }

    func startVideoRecording() {
        guard !isRecording else { return }
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("video_\(Int(Date().timeIntervalSince1970)).mov")
        videoOutput.startRecording(to: tempURL, recordingDelegate: self)
        isRecording = true
    }

    func stopVideoRecording() {
        guard isRecording else { return }
        videoOutput.stopRecording()
        isRecording = false
    }

    func addCapturedMedia(image: UIImage) {
        let location = locationManager.location
        let media = CapturedMedia(
            id: UUID(),
            image: image,
            videoURL: nil,
            timestamp: Date(),
            latitude: location?.coordinate.latitude,
            longitude: location?.coordinate.longitude
        )
        capturedPhotos.append(media)
    }

    func clearCaptures() {
        capturedPhotos.removeAll()
    }
}

extension CameraManager: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        Task { @MainActor in
            guard let data = photo.fileDataRepresentation(),
                  let image = UIImage(data: data) else {
                self.photoContinuation?.resume(returning: nil)
                self.photoContinuation = nil
                return
            }
            self.photoContinuation?.resume(returning: image)
            self.photoContinuation = nil
        }
    }
}

extension CameraManager: AVCaptureFileOutputRecordingDelegate {
    nonisolated func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        Task { @MainActor in
            let location = self.locationManager.location
            let media = CapturedMedia(
                id: UUID(),
                image: nil,
                videoURL: outputFileURL,
                timestamp: Date(),
                latitude: location?.coordinate.latitude,
                longitude: location?.coordinate.longitude
            )
            self.capturedPhotos.append(media)
        }
    }
}

struct CapturedMedia: Identifiable {
    let id: UUID
    let image: UIImage?
    let videoURL: URL?
    let timestamp: Date
    let latitude: Double?
    let longitude: Double?

    var isVideo: Bool { videoURL != nil }
}
