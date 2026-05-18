import cloudinary from "../config/cloudinary.js";

const uploadImageCloudinary = async (image, folder = "gallery/images") => {
  try {
    // Buffer create karna: multer buffer or web file
    const buffer = image?.buffer
      ? image.buffer
      : Buffer.from(await image.arrayBuffer());

    // Return promise for upload_stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image", // Only image
          transformation: [
            { quality: "auto", fetch_format: "auto" },

            {
              overlay: {
                font_family: "Arial",
                font_size: 45,
                font_weight: "bold",
                text: "greenevelvet.com"
              },
              color: "white",
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
