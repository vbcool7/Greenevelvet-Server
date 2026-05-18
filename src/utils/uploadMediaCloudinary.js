import cloudinary from "../config/cloudinary.js";

export const uploadMediaCloudinary = (file, folder) => {
    return new Promise((resolve, reject) => {
        const isVideo = file.mimetype && file.mimetype.includes("video");

        cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                transformation: [

                    {
                        quality: "auto",
                        fetch_format: "auto",
                        ...(isVideo && { bitrate: "auto" })
                    },

                    {
                        overlay: {
                            font_family: "Arial",
                            font_size: isVideo ? 30 : 45,
                            font_weight: "bold",
                            text: "greenevelvet.com"
                        },
                        color: "white",
                        opacity: 35,
                        gravity: isVideo ? "south_east" : "center",
                        ...(isVideo && { x: 30, y: 30 })
                    }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        ).end(file.buffer);
    });
};