import fs from "fs";
import cloudinary from "../config/cloudinary.js";

export const uploadFromCloudinary = async (filePath, folder = "uploads") => {
    try {
        if (!filePath) throw new Error("File path is required");

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: "image", // ✅ only images
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };

    } catch (error) {
        console.log("uploadFromCloudinary error:", error);
        throw new Error("Image upload failed");
    } finally {
        // cleanup local file
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};