import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

// Function signature me addWatermark (default: true) maintained hai
export const uploadFromCloudinary = async (fileBuffer, addWatermark = true) => {
    try {
        if (!fileBuffer) throw new Error("File buffer is required");

        // 1. Resizing check for high-resolution images (>24 Megapixels)
        const metadata = await sharp(fileBuffer).metadata();

        if (metadata.width && metadata.height) {
            const megapixels = (metadata.width * metadata.height) / 1_000_000;

            if (megapixels > 24) {
                const scale = Math.sqrt(24 / megapixels);

                const newWidth = Math.floor(metadata.width * scale);
                const newHeight = Math.floor(metadata.height * scale);

                fileBuffer = await sharp(fileBuffer)
                    .resize(newWidth, newHeight, {
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .toBuffer();
            }
        }

        // 2. Base transformations
        const transformations = [{
            quality: "auto",
            fetch_format: "auto"
        }];

        // 3. Dynamic Logo Watermark (Agar addWatermark true ho)
        if (addWatermark) {
            const updatedMetadata = await sharp(fileBuffer).metadata();
            const imageWidth = updatedMetadata.width || 1000;

            // Logo size calculation (35% of image width)
            const calculatedLogoWidth = Math.round(imageWidth * 0.35);
            const logoWidth = Math.max(180, Math.min(calculatedLogoWidth, 500));

            // Format public_id for Cloudinary overlay (slash to colon conversion)
            const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

            transformations.push({
                overlay: logoPublicId,
                width: logoWidth,
                opacity: 35,
                gravity: "center"
            });
        }

        // 4. Cloudinary Stream Upload
        return await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                    folder: "uploads",
                    resource_type: "image",
                    transformation: transformations
                },
                (error, result) => {
                    if (error) return reject(error);

                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                    });
                }
            ).end(fileBuffer);
        });

    } catch (error) {
        console.error("upload error:", error);
        throw new Error("Image upload failed");
    }
};