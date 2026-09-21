import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

const uploadImageCloudinary = async (image, folder = "gallery/images") => {
  try {
    // Buffer create: multer buffer or web file
    const buffer = image?.buffer
      ? image.buffer
      : Buffer.from(await image.arrayBuffer());

    const metadata = await sharp(buffer).metadata();
    const imageWidth = metadata.width || 1000;

    // Dynamic Logo Width (Main image ki width ka 25%)
    const calculatedLogoWidth = Math.round(imageWidth * 0.25);

    // Min / Max Control (Minimum 120px, Maximum 350px)
    const logoWidth = Math.max(120, Math.min(calculatedLogoWidth, 350));

    // Cloudinary overlay transformation requires ':' for folder paths
    const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

    // Return promise for upload_stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image", // Only image
          transformation: [
            { quality: "auto", fetch_format: "auto" },

            // Image Logo Watermark Overlay
            {
              overlay: logoPublicId, // uploads:ejzrpoaarzqqcqatmd7m
              width: logoWidth,      // Dynamic responsive width
              opacity: 35,           // Transparency level
              gravity: "center"      // Position
            }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(new Error("Image upload failed"));
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
    console.error("UploadImageCloudinary failed:", err);
    throw new Error("Image upload failed");
  }
};

export default uploadImageCloudinary;