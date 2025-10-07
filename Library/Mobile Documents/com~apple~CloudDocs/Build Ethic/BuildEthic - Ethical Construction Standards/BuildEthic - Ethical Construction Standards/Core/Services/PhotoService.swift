import UIKit
import Photos

final class PhotoService: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    static let shared = PhotoService()
    private var onPick: ((UIImage) -> Void)?

    func presentCamera(from vc: UIViewController, onPick: @escaping (UIImage) -> Void) {
        self.onPick = onPick
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = self
        vc.present(picker, animated: true)
    }

    func imagePickerController(
        _ picker: UIImagePickerController, 
        didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
    ) {
        picker.dismiss(animated: true)
        guard let img = info[.originalImage] as? UIImage else { return }
        onPick?(img)
    }

    func upload(_ image: UIImage, projectId: String?) async throws {
        let data = image.jpegData(compressionQuality: 0.8)!
        var body: [String: Any] = [
            "meta": [
                "w": Int(image.size.width), 
                "h": Int(image.size.height)
            ]
        ]
        if let projectId { 
            body["projectId"] = projectId 
        }
        let base64 = data.base64EncodedString()
        body["data"] = base64
        
        struct Res: Decodable { let id: String }
        _ = try await APIClient.shared.post("/photos", body: body) as Res
    }
}



