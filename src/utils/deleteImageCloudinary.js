import cloudinary from "../config/cloudinary.js";

const deleteImageCloudinary = async (public_id) => {
  try {
    if (!public_id) throw new Error("public_id is required for deletion");

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        public_id,
        { resource_type: "image" }, // Only images
        (error, result) => {
          if (error) {
            console.error("Cloudinary delete error:", error);
            return reject(new Error("Image delete failed"));
          }
          resolve(result); // result has 'result: "ok"' if successful
        }
      );
    });
  } catch (err) {
    console.error("deleteImageCloudinary failed:", err);
    throw new Error("Image delete failed");
  }
};

export default deleteImageCloudinary;
