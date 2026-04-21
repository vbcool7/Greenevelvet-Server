import cloudinary from "../config/cloudinary.js";

export const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return;

        return await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });

    } catch (error) {
        console.log("deleteFromCloudinary error:", error);
        throw new Error("Image delete failed");
    }
};

