import cloudinary from "../config/cloudinary.js";

// Function to delete video from Cloudinary
const deleteVideoCloudinary = async (public_id) => {
  try {
    if (!public_id) throw new Error("public_id is required for deletion");

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        public_id,
        { resource_type: "video" }, // Only videos
        (error, result) => {
          if (error) {
            console.error("Cloudinary video delete error:", error);
            return reject(new Error("Video delete failed"));
          }
          resolve(result); // result.result === "ok" if successful
        }
      );
    });
  } catch (err) {
    console.error("deleteVideoCloudinary failed:", err);
    throw new Error("Video delete failed");
  }
};

export default deleteVideoCloudinary;
