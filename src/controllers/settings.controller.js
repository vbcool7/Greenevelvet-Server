import settingsModel from "../models/settingsModel.js";
import fs from "fs";
import { uploadFromCloudinary } from "../utils/uploadFromCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";

// fetch settings
export const getSettings = async (request, response) => {
    try {
        console.log("setting fecth run");

        let settings = await settingsModel.findOne({ singleton: "unique_settings" }).lean();

        // create if not exists
        if (!settings) {
            const newSettings = await settingsModel.create({});
            settings = newSettings.toObject();
        }

        return response.status(200).json({
            message: "Settings fetched successfully",
            success: true,
            error: false,
            data: settings,
        });

    } catch (error) {
        console.log("setting fetch error", error);
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};

// update site identity 
export const updateSiteIdentity = async (request, response) => {
    let uploadedLogo = null;
    let uploadedBanner = null;

    try {
        let settings = await settingsModel.findOneAndUpdate(
            { singleton: "unique_settings" },
            { $setOnInsert: { singleton: "unique_settings" } },
            { new: true, upsert: true }
        );

        const allowedFields = ["taglineLine1", "taglineLine2"];
        let updateData = {};

        // ===== TEXT FIELDS =====
        allowedFields.forEach((field) => {
            if (request.body[field] !== undefined) {
                updateData[field] = request.body[field];
            }
        });

        const logoFile = request.files?.logo?.[0];
        const bannerFile = request.files?.banner?.[0];

        try {
            // ===== PARALLEL UPLOAD =====
            [uploadedLogo, uploadedBanner] = await Promise.all([
                logoFile ? uploadFromCloudinary(logoFile.path) : null,
                bannerFile ? uploadFromCloudinary(bannerFile.path) : null,
            ]);
        } catch (uploadError) {
            // 🔥 CLEANUP uploaded images if partial success
            if (uploadedLogo?.public_id) {
                await deleteFromCloudinary(uploadedLogo.public_id);
            }
            if (uploadedBanner?.public_id) {
                await deleteFromCloudinary(uploadedBanner.public_id);
            }
            throw uploadError;
        } finally {
            // ===== TEMP FILE CLEANUP =====
            if (logoFile?.path && fs.existsSync(logoFile.path)) {
                fs.unlink(logoFile.path, () => { });
            }
            if (bannerFile?.path && fs.existsSync(bannerFile.path)) {
                fs.unlink(bannerFile.path, () => { });
            }
        }

        // ===== LOGO =====
        if (uploadedLogo) {
            try {
                if (settings.logoPublicId) {
                    await deleteFromCloudinary(settings.logoPublicId);
                }
            } catch (err) {
                console.log("old logo delete failed:", err.message);
            }

            updateData.logo = uploadedLogo.url;
            updateData.logoPublicId = uploadedLogo.public_id;
        }

        // ===== BANNER =====
        if (uploadedBanner) {
            try {
                if (settings.bannerPublicId) {
                    await deleteFromCloudinary(settings.bannerPublicId);
                }
            } catch (err) {
                console.log("old banner delete failed:", err.message);
            }

            updateData.banner = uploadedBanner.url;
            updateData.bannerPublicId = uploadedBanner.public_id;
        }

        // ❗ No valid update check
        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({
                message: "No valid fields provided",
                success: false,
                error: true,
            });
        }

        // ===== PRELOAD =====
        const finalLogo = updateData.logo || settings.logo;
        const finalBanner = updateData.banner || settings.banner;

        updateData.preloadAssets = [finalLogo, finalBanner].filter(Boolean);

        const updated = await settingsModel.findByIdAndUpdate(
            settings._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            message: "Site Identity updated successfully",
            success: true,
            error: false,
            data: updated,
        });

    } catch (error) {
        console.log("site identity error :", error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};

// update preference
export const updatePreferences = async (request, response) => {
    try {
        let settings = await settingsModel.findOne({ singleton: "unique_settings" });

        if (!settings) {
            settings = await settingsModel.create({});
        }

        const allowedFields = [
            "enableSubscription",
            "escortApprovalRequired",
            "enableLogin",
            "enableSignup",
            "profileVisibility",
            "notifications",
            "maintenanceMode",
        ];

        let updateData = {};

        allowedFields.forEach((field) => {
            if (request.body[field] !== undefined) {
                updateData[field] = request.body[field];
            }
        });

        console.log("filtered preference data :", updateData);

        // ❗ No valid field check
        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({
                message: "No valid fields provided",
                success: false,
                error: true,
            });
        }

        const updated = await settingsModel.findByIdAndUpdate(
            settings._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            message: "Preferences updated successfully",
            success: true,
            error: false,
            data: updated,
        });

    } catch (error) {
        console.log("preference error :", error);
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};