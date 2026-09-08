import settingsModel from "../models/settingsModel.js";
import fs from "fs";
import {
    uploadFromCloudinary
} from "../utils/uploadFromCloudinary.js";
import {
    deleteFromCloudinary
} from "../utils/deleteFromCloudinary.js";

// fetch settings
export const getSettings = async (request, response) => {
    try {
        console.log("setting fecth run");

        let settings = await settingsModel.findOne({
            singleton: "unique_settings"
        }).lean();

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

export const updateContactInfo = async (request, response) => {
    try {

        const {
            email,
            address
        } = request.body;

        let settings = await settingsModel.findOne({
            singleton: "unique_settings"
        });

        if (!settings) {
            settings = await settingsModel.create({
                singleton: "unique_settings"
            });
        }

        let updateData = {};

        if (email !== undefined) {
            updateData["contactInfo.email"] = email;
        }

        if (address !== undefined) {
            updateData["contactInfo.address"] = address;
        }

        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({
                message: "No data provided to update",
                success: false,
            });
        }


        const updated = await settingsModel.findByIdAndUpdate(
            settings._id, {
                $set: updateData
            }, {
                new: true,
                runValidators: true
            }
        );

        return response.status(200).json({
            message: "Contact info updated successfully",
            success: true,
            error: false,
            data: updated,
        });

    } catch (error) {
        console.log("contact info error :", error);
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};

// update site identity 
export const updateSiteIdentity = async (request, response, next) => {
    let uploadedLogo = null;
    let uploadedBanner = null;
    let uploadedMobileBanner = null;

    try {
        let settings = await settingsModel.findOneAndUpdate({
            singleton: "unique_settings"
        }, {
            $setOnInsert: {
                singleton: "unique_settings"
            }
        }, {
            new: true,
            upsert: true
        });

        const updateData = {};

        // ===== 1. TAGLINE LINE 1 (Compulsory/Required) =====
        if (request.body.taglineLine1 !== undefined) {
            try {
                const parsed = typeof request.body.taglineLine1 === "string" ?
                    JSON.parse(request.body.taglineLine1) :
                    request.body.taglineLine1;

                if (
                    parsed?.text &&
                    parsed?.highlight &&
                    parsed.text.includes(parsed.highlight)
                ) {
                    updateData.taglineLine1 = {
                        text: parsed.text.trim(),
                        highlight: parsed.highlight.trim(),
                    };
                } else {
                    return response.status(400).json({
                        success: false,
                        message: "Invalid format for taglineLine1. Highlight must be within text.",
                    });
                }
            } catch (err) {
                return response.status(400).json({
                    success: false,
                    message: "Invalid JSON format for taglineLine1",
                });
            }
        }

        // ===== 2. TAGLINE LINE 2 (Optional) =====
        if (request.body.taglineLine2 !== undefined) {
            try {
                // Client ne empty string ya null bheja h toh field ko reset/empty kar do
                if (!request.body.taglineLine2 || request.body.taglineLine2 === '""') {
                    updateData.taglineLine2 = {
                        text: "",
                        highlight: ""
                    };
                } else {
                    const parsed = typeof request.body.taglineLine2 === "string" ?
                        JSON.parse(request.body.taglineLine2) :
                        request.body.taglineLine2;

                    // Object me text empty hai
                    if (!parsed?.text || parsed?.text.trim() === "") {
                        updateData.taglineLine2 = {
                            text: "",
                            highlight: ""
                        };
                    }
                    // Text available hone par highlight validation
                    else if (parsed?.text) {
                        const highlight = parsed?.highlight || "";

                        if (highlight && !parsed.text.includes(highlight)) {
                            return response.status(400).json({
                                success: false,
                                message: "taglineLine2 highlight must be present inside text",
                            });
                        }

                        updateData.taglineLine2 = {
                            text: parsed.text.trim(),
                            highlight: highlight.trim(),
                        };
                    }
                }
            } catch (err) {
                return response.status(400).json({
                    success: false,
                    message: "Invalid JSON format for taglineLine2",
                });
            }
        }

        // ===== 3. FILES PROCESSING =====
        const logoFile = request.files?.logo?. [0];
        const bannerFile = request.files?.banner?. [0];
        const mobilebannerFile = request.files?.mobilebanner?. [0];

        if (logoFile) {
            uploadedLogo = await uploadFromCloudinary(logoFile.buffer);
        }

        if (bannerFile) {
            uploadedBanner = await uploadFromCloudinary(bannerFile.buffer);
        }

        if (mobilebannerFile) {
            uploadedMobileBanner = await uploadFromCloudinary(mobilebannerFile.buffer);
        }

        // ===== 4. CLOUDINARY LOGO REPLACE =====
        if (uploadedLogo) {
            if (settings.logoPublicId) {
                await deleteFromCloudinary(settings.logoPublicId);
            }

            updateData.logo = uploadedLogo.url;
            updateData.logoPublicId = uploadedLogo.public_id;
        }

        // ===== 5. CLOUDINARY BANNER REPLACE =====
        if (uploadedBanner) {
            if (settings.bannerPublicId) {
                await deleteFromCloudinary(settings.bannerPublicId);
            }

            updateData.banner = uploadedBanner.url;
            updateData.bannerPublicId = uploadedBanner.public_id;
        }

        // ===== 6. CLOUDINARY MOBILE BANNER REPLACE =====
        if (uploadedMobileBanner) {
            if (settings.mobilebannerPublicId) {
                await deleteFromCloudinary(settings.mobilebannerPublicId);
            }

            updateData.mobilebanner = uploadedMobileBanner.url;
            updateData.mobilebannerPublicId = uploadedMobileBanner.public_id;
        }

        // ===== 7. VALIDATION CHECK =====
        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({
                message: "No valid fields provided",
                success: false,
                error: true,
            });
        }

        // ===== 8. UPDATE DATABASE =====
        const updated = await settingsModel.findByIdAndUpdate(
            settings._id, {
                $set: updateData
            }, {
                new: true,
                runValidators: true
            }
        );

        return response.status(200).json({
            message: "Site Identity updated successfully",
            success: true,
            error: false,
            data: updated,
        });

    } catch (error) {
        console.log("site identity error:", error);

        // Agar response pehle hi sent ho chuka hai, dubara response bhejkar crash na karein
        if (response.headersSent) {
            return next ? next(error) : null;
        }

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
        let settings = await settingsModel.findOne({
            singleton: "unique_settings"
        });

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
            settings._id, {
                $set: updateData
            }, {
                new: true,
                runValidators: true
            }
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