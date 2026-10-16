import mongoose from "mongoose";
import StoryModel from "../models/storyModel.js";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import {
    uploadMediaCloudinary
} from "../utils/uploadMediaCloudinary";


// Create Story
export const createStory = async (req, res) => {
    let uploadedPublicId = null;
    let uploadedResourceType = "image";

    try {
        const escortId = req.user?._id;
        const {
            caption = ""
        } = req.body;

        // 1. Authenticate escort
        if (!escortId || !mongoose.Types.ObjectId.isValid(escortId)) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access.",
            });
        }

        // 2. Validate caption
        if (
            typeof caption !== "string" ||
            caption.trim().length > 500
        ) {
            return res.status(400).json({
                success: false,
                message: "Caption cannot exceed 500 characters.",
            });
        }

        // 3. Verify escort approval
        const escort = await EscortModel.findById({
            _id: escortId,
            isVerified: true,
            status: "Active",
            "avatar.status": "Approved",
        }).select("_id");

        if (!escort) {
            return res.status(403).json({
                success: false,
                message: "Only approved escorts can create stories.",
            });
        }

        // 4. Validate single uploaded file
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image or video.",
            });
        }

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported image or video format.",
            });
        }

        const mediaType = file.mimetype.startsWith("video/") ?
            "video" :
            "image";

        uploadedResourceType = mediaType;

        // 5. Check maximum 10 active stories
        const activeStoriesCount = await StoryModel.countDocuments({
            escortId,
            status: "active",
            expiresAt: {
                $gt: new Date()
            },
        });

        if (activeStoriesCount >= 10) {
            return res.status(400).json({
                success: false,
                message: "You can have a maximum of 10 active stories.",
            });
        }

        // 6. Upload one media file to Cloudinary
        const uploadResult = await uploadMediaCloudinary(
            file,
            "greene-velvet/stories"
        );

        uploadedPublicId = uploadResult.public_id;

        if (!uploadResult.secure_url || !uploadedPublicId) {
            throw new Error("Cloudinary upload returned incomplete media details.");
        }

        // 7. Set 24-hour expiry
        const createdAt = new Date();

        const expiresAt = new Date(
            createdAt.getTime() + 24 * 60 * 60 * 1000
        );

        // 8. Save story in MongoDB
        const story = await StoryModel.create({
            escortId,
            mediaType,
            mediaUrl: uploadResult.secure_url,
            publicId: uploadedPublicId,
            caption: caption.trim(),
            status: "active",
            createdAt,
            expiresAt,
        });

        // Database save successful; do not clean up this asset
        uploadedPublicId = null;

        return res.status(201).json({
            success: true,
            error: false,
            message: "Story created successfully.",
            data: story,
        });
    } catch (error) {
        console.error("Create story error:", error);

        // 9. Remove Cloudinary asset if database save fails
        if (uploadedPublicId) {
            try {
                await cloudinary.uploader.destroy(uploadedPublicId, {
                    resource_type: uploadedResourceType === "video" ?
                        "video" : "image"
                });
            } catch (cleanupError) {
                console.error("Story media cleanup error:", cleanupError);
            }
        }



        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to create story.",
        });
    }
};


// fetch created active story escorts
export const fetchCreatedActiveStoryEscorts = async (req, res) => {
    try {
        const now = new Date();

        // Find escort IDs that have active, unexpired stories
        const activeStoryEscortIds = await StoryModel.distinct("escortId", {
            status: "active",
            expiresAt: {
                $gt: now
            },
        });

        if (!activeStoryEscortIds.length) {
            return res.status(200).json({
                success: true,
                error: false,
                message: "No active story escorts found.",
                data: [],
            });
        }

        // Fetch only basic details of eligible escorts
        const escorts = await EscortModel.find({
                _id: {
                    $in: activeStoryEscortIds
                },
                isVerified: true,
                status: "Active",
                "avatar.status": "Approved",
            })
            .select("_id name city avatar escortId")
            .lean();

        return res.status(200).json({
            success: true,
            error: false,
            message: "Active story escorts fetched successfully.",
            data: escorts,
        });
    } catch (error) {
        console.error("Fetch active story escorts error:", error);

        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to fetch active story escorts.",
        });
    }
};


// fetch selected escort story
export const fetchSelectedEscortActiveStories = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "Invalid escort ID.",
            });
        }

        const now = new Date();

        // Verify that the escort is approved and active
        const escort = await EscortModel.findById({
            _id: id,
            isVerified: true,
            status: "Active",
            "avatar.status": "Approved",
        }).select("_id");

        if (!escort) {
            return res.status(404).json({
                success: false,
                error: true,
                message: "Escort not found.",
            });
        }

        // Fetch only active and unexpired stories for this escort
        const stories = await StoryModel.find({
                id,
                status: "active",
                expiresAt: {
                    $gt: now
                },
            })
            .select("_id escortId mediaType mediaUrl caption createdAt expiresAt")
            .sort({
                createdAt: 1
            })
            .lean();

        return res.status(200).json({
            success: true,
            error: false,
            message: stories.length ?
                "Active stories fetched successfully." : "No active stories found.",
            data: stories,
        });
    } catch (error) {
        console.error("Fetch selected escort stories error:", error);

        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to fetch active stories.",
        });
    }
};


// deleted selected story
export const deleteSelectedStoryController = async (req, res) => {
    try {
        const {
            storyId
        } = req.params;
        const escortId = req.user?._id;

        if (!escortId) {
            return res.status(401).json({
                success: false,
                error: true,
                message: "Unauthorized access.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({
                success: false,
                error: true,
                message: "Invalid story ID.",
            });
        }

        // Find story owned by the logged-in escort
        const story = await StoryModel.findOne({
            _id: storyId,
            escortId,
        });

        if (!story) {
            return res.status(404).json({
                success: false,
                error: true,
                message: "Story not found.",
            });
        }

        // Delete media from Cloudinary
        if (story.publicId) {
            await cloudinary.uploader.destroy(story.publicId, {
                resource_type: story.mediaType === "video" ? "video" : "image",
            });
        }

        // Delete story from MongoDB
        await StoryModel.deleteOne({
            _id: story._id
        });

        return res.status(200).json({
            success: true,
            error: false,
            message: "Story deleted successfully.",
        });
    } catch (error) {
        console.error("Delete story error:", error);

        return res.status(500).json({
            success: false,
            error: true,
            message: "Failed to delete story.",
        });
    }
};