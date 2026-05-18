import cloudinary from "../config/cloudinary.js";

const uploadVideoCloudinary = async (video, folder = "gallery/videos") => {
  try {

    const buffer = video?.buffer
      ? video.buffer
      : Buffer.from(await video.arrayBuffer());

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "video",
          transformation: [
            { quality: "auto", bitrate: "auto", fetch_format: "auto" },

            {
              overlay: {
                font_family: "Arial",
                font_size: 30,
                font_weight: "bold",
                text: "greenevelvet.com"
              },
              color: "white",
              opacity: 35,
              gravity: "south_east",
              x: 30,
              y: 30

            }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary video upload error:", error);
            return reject(new Error("Video upload failed"));
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
    console.error("uploadVideoCloudinary failed:", err);
    throw new Error("Video upload failed");
  }
};

export default uploadVideoCloudinary;
