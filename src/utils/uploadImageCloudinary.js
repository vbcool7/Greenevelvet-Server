import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

const uploadImageCloudinary = async (image, folder = "gallery/images") => {
  try {
    // 1. Safe Buffer Creation
    const buffer = image?.buffer ?
      image.buffer :
      Buffer.from(await image.arrayBuffer());

    // 2. Extract Metadata via Sharp
    const metadata = await sharp(buffer).metadata();
    const imageWidth = metadata.width || 1000;

    // 3. Calculate Responsive Logo Width (35% of Main Image Width)
    const calculatedLogoWidth = Math.round(imageWidth * 0.35);

    // 4. Set Min/Max Limits (Min: 180px, Max: 500px)
    const logoWidth = Math.max(180, Math.min(calculatedLogoWidth, 500));

    // 5. Format Cloudinary Overlay Public ID (slashes replaced with colons)
    const logoPublicId = "uploads/ejzrpoaarzqqcqatmd7m".replace(/\//g, ":");

    // 6. Return Upload Stream Promise
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
          folder,
          resource_type: "image",
          transformation: [{
              quality: "auto",
              fetch_format: "auto"
            },
            {
              overlay: logoPublicId,
              width: logoWidth,
              opacity: 35,
              gravity: "center"
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