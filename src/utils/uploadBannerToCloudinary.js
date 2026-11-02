import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

export const uploadBannerToCloudinary = async (fileBuffer) => {
  try {
    if (!fileBuffer) {
      throw new Error("File buffer is required");
    }

    // 1. Image metadata
    const metadata = await sharp(fileBuffer).metadata();

    // 2. Resize images larger than 24 Megapixels
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

    // 3. Cloudinary upload without watermark
    return await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "banners",
            resource_type: "image",
            transformation: [
              {
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          },
        )
        .end(fileBuffer);
    });
  } catch (error) {
    console.error("Banner upload error:", error);
    throw new Error("Banner image upload failed");
  }
};
