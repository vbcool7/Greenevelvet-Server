import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import sharp from "sharp";

export const uploadFromCloudinary = async (fileBuffer) => {
    try {
        if (!fileBuffer) throw new Error("File buffer is required");

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

        const imageWidth = (await sharp(fileBuffer).metadata()).width || 1000;


        // Dynamic font size
        const dynamicFontSize = Math.round(imageWidth * 0.05);

        // Min / Max control
        const fontSize = Math.max(30, Math.min(dynamicFontSize, 80));

        return await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                    folder: "uploads",
                    resource_type: "image",
                    transformation: [{
                            quality: "auto",
                            fetch_format: "auto"
                        },

                        {
                            overlay: {
                                font_family: "Arial",
                                font_size: fontSize,
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