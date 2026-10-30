import multer from "multer"

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    if(!allowedTypes.includes(file.mimetype)){
        return cb(
            new Error("Only JPG, PNG, and WEBP images are allowed")
        )
    }

    cb(null, true)
}

export const uploadRoomImages = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB per image
    }
})