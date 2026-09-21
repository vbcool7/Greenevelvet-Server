import cloudinary from "../config/cloudinary.js";

export const uploadMediaCloudinary = (file, folder) => {
    return new Promise((resolve, reject) => {
        const isVideo = file.mimetype && file.mimetype.includes("video");

        // Cloudinary overlay transformation demands ':' instead of '/' for folder paths
        const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

        cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                transformation: [
                    // 1. Quality & Format Optimization
                    {
                        quality: "auto",
                        fetch_format: "auto",
                        ...(isVideo && { bitrate: "auto" })
                    },

                    // 2. Dynamic Image Logo Watermark Overlay
                    {
                        overlay: logoPublicId, // uploads:ejzrpoaarzqqcqatmd7m
                        width: isVideo ? 120 : 180, // Logo size (px)
                        opacity: 35, // Transparency level
                        gravity: isVideo ? "south_east" : "center", // Centered on images, bottom-right on videos
                        ...(isVideo && { x: 30, y: 30 })
                    }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        ).end(file.buffer);
    });
};