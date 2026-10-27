import cloudinary from "../config/cloudinary.js";

export const uploadMediaCloudinary = (file, folder) => {
    return new Promise((resolve, reject) => {
        try {
            if (!file || !file.buffer) {
                return reject(new Error("Invalid file buffer provided"));
            }

            const isVideo = file.mimetype && file.mimetype.includes("video");

            // Format Cloudinary Overlay Public ID (slashes replaced with colons)
            const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: "auto",
                    transformation: [
                        {
                            quality: "auto",
                            fetch_format: "auto",
                            ...(isVideo && { bitrate: "auto" })
                        },
                        {
                            overlay: logoPublicId,
                            width: isVideo ? 160 : 250,
                            opacity: 35,
                            gravity: isVideo ? "south_east" : "center",
                            ...(isVideo && { x: 30, y: 30 })
                        }
                    ]
                },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary media upload error:", error);
                        return reject(error);
                    }
                    resolve(result);
                }
            );

            uploadStream.end(file.buffer);
        } catch (err) {
            console.error("uploadMediaCloudinary execution error:", err);
            reject(err);
        }
    });
};