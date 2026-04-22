import multer from "multer";

// Memory storage for direct upload to Cloudinary
const storage = multer.memoryStorage();

// Multer config for images + videos
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true); // Image allowed
        } else if (file.mimetype.startsWith("video/")) {
            cb(null, true); // Video allowed
        } else {
            cb(new Error("Only image or video files allowed"), false);
        }
    },
    limits: {
        // Use field-level size check in controller for different limits
        fileSize: 10 * 1024 * 1024, // max 10MB per file
    },
});

export default upload;
