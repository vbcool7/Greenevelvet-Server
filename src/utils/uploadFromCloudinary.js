import fs from "fs";
import cloudinary from "../config/cloudinary.js";


export const uploadFromCloudinary = async (fileBuffer) => {
    try {
        if (!fileBuffer) throw new Error("File buffer is required");

        return await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "uploads",
                    resource_type: "image",
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
        console.log("upload error:", error);
        throw new Error("Image upload failed");
    }
};