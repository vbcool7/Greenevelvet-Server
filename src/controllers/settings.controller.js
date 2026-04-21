import settingsModel from "../models/settingsModel.js";
import deleteImageCloudinary from "../utils/deleteImageCloudinary.js";
import uploadImageCloudinary from "../utils/uploadImageCloudinary.js";

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

export const updateSettings = async (request, response) => {
    try {
        let settings = await settingsModel.findOne({ singleton: "unique_settings" });

        if (!settings) {
            settings = await settingsModel.create({});
        }

        let updateData = { ...request.body };

        console.log("request body :", updateData);

        // ===== LOGO =====
        if (request.files?.logo?.length > 0) {
            // delete old logo
            if (settings.logoPublicId) {
                await deleteImageCloudinary(settings.logoPublicId);
            }

            // upload new logo
            const uploadedLogo = await uploadImageCloudinary(request.files.logo[0].path);

            updateData.logo = uploadedLogo.url;
            updateData.logoPublicId = uploadedLogo.public_id;
        }

        // ===== BANNER =====
        if (request.files?.banner?.length > 0) {
            if (settings.bannerPublicId) {
                await deleteImageCloudinary(settings.bannerPublicId);
            }

            const uploadedBanner = await uploadImageCloudinary(request.files.banner[0].path);

            updateData.banner = uploadedBanner.url;
            updateData.bannerPublicId = uploadedBanner.public_id;
        }

        // ===== PRELOAD AUTO =====
        updateData.preloadAssets = [
            updateData.logo || settings.logo,
            updateData.banner || settings.banner,
        ].filter(Boolean);

        // ===== UPDATE =====
        const updatedSettings = await settingsModel.findByIdAndUpdate(
            settings._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return response.status(200).json({
            message: "Settings updated successfully",
            success: true,
            error: false,
            data: updatedSettings,
        });

    } catch (error) {
        console.log("setting error", error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};