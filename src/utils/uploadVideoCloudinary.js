import cloudinary from "../config/cloudinary.js";

const uploadVideoCloudinary = async (video, folder = "gallery/videos") => {
  try {
    const buffer = video?.buffer ?
      video.buffer :
      Buffer.from(await video.arrayBuffer());

    // Cloudinary overlay transformation requires ':' instead of '/' for sub-folders
    const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
          folder,
          resource_type: "video",
          transformation: [{
              quality: "auto",
              bitrate: "auto",
              fetch_format: "auto"
            },

            // Video Logo Watermark Overlay
            {
              overlay: logoPublicId,
              width: 180, // Fixed logo width suitable for video overlays
              opacity: 35, // Watermark transparency level
              gravity: "south_east", // Positioned at bottom-right corner
              x: 30,
              y: 30
            }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary video upload error:", error);
            return reject(new Error("Video upload failed"));
          }
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url
          });
        }
      );

      uploadStream.end(buffer);
    });
  } catch (err) {
    console.error("uploadVideoCloudinary failed:", err);
    throw new Error("Video upload failed");
  }
};

export default uploadVideoCloudinary;