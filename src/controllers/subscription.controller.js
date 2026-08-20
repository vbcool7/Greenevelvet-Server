import SubscriptionModel from "../models/subscriptionModel.js";
import mongoose from "mongoose";

// create plan
export const createPlan = async (req, res) => {
    try {
        const {
            title,
            slug,
            duration,
            originalPrice,
            discountedPrice,
            currency,
            features,
            totalSpots,
            isFeatureHide
        } = req.body;

        // ✅ Basic validation
        if (!title || !slug || !duration || originalPrice === undefined || discountedPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing"
            });
        }

        const count = await SubscriptionModel.countDocuments();
        if (count >= 4) {
            return res.status(400).json({
                success: false,
                message: "Only 4 plans allowed"
            });
        }

        // ✅ Check duplicate slug
        const existing = await SubscriptionModel.findOne({
            slug
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Plan with this slug already exists"
            });
        }

        // ✅ Create plan
        const plan = new SubscriptionModel({
            title,
            slug,
            duration,
            originalPrice,
            discountedPrice,
            currency,
            features,
            totalSpots,
            isFeatureHide
        });

        await plan.save();

        return res.status(201).json({
            success: true,
            message: "Plan created successfully",
            data: plan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// update plan
export const updatePlan = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        // ✅ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID"
            });
        }

        const {
            title,
            slug,
            duration,
            originalPrice,
            discountedPrice,
            currency,
            features,
            totalSpots,
            isFeatureHide,
            isActive
        } = req.body;

        // ✅ Check plan exist
        const existingPlan = await SubscriptionModel.findById(id);
        if (!existingPlan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        // ✅ Slug duplicate check (excluding current)
        if (slug) {
            const duplicate = await SubscriptionModel.findOne({
                slug,
                _id: {
                    $ne: id
                }
            });

            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: "Slug already in use"
                });
            }
        }

        // Use new slug if provided, otherwise existing slug
        const planSlug = slug || existingPlan.slug;

        // Plan permissions and limits
        let permissions = existingPlan.permissions;
        let limits = existingPlan.limits;

        if (planSlug === "velvet-start") {

            permissions = {
                messaging: false,
                reviews: false,
                analytics: false,
                prioritySearch: false
            };

            limits = {
                photos: 6,
                baseLocations: 1,
                manualBoosts: 0,
                boostCycleDays: 0
            };

        } else if (planSlug === "velvet-lite") {

            permissions = {
                messaging: false,
                reviews: false,
                analytics: true,
                prioritySearch: true
            };

            limits = {
                photos: 15,
                baseLocations: 1,
                manualBoosts: 2,
                boostCycleDays: 28
            };

        } else if (planSlug === "velvet-premium") {

            permissions = {
                messaging: true,
                reviews: true,
                analytics: true,
                prioritySearch: true
            };

            limits = {
                photos: 25,
                baseLocations: 2,
                manualBoosts: 8,
                boostCycleDays: 28
            };

        } else if (planSlug === "velvet-luxe") {

            permissions = {
                messaging: true,
                reviews: true,
                analytics: true,
                prioritySearch: true
            };

            limits = {
                photos: 30,
                baseLocations: 3,
                manualBoosts: 16,
                boostCycleDays: 28
            };

        } else {

            return res.status(400).json({
                success: false,
                message: `Unsupported plan slug: ${planSlug}`
            });
        }

        // ✅ Update object (only passed fields)
        const updateData = {
            ...(title && {
                title
            }),
            ...(slug && {
                slug
            }),
            ...(duration && {
                duration
            }),
            ...(originalPrice !== undefined && {
                originalPrice
            }),
            ...(discountedPrice !== undefined && {
                discountedPrice
            }),
            ...(currency && {
                currency
            }),
            ...(features && {
                features
            }),
            ...(totalSpots !== undefined && {
                totalSpots
            }),
            ...(isFeatureHide !== undefined && {
                isFeatureHide
            }),
            ...(isActive !== undefined && {
                isActive
            })
        };

        const updatedPlan = await SubscriptionModel.findByIdAndUpdate(
            id,
            updateData, {
                new: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Plan updated successfully",
            data: updatedPlan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// get all active plan for Model
export const getAllActivePlans = async (req, res) => {
    try {
        const plans = await SubscriptionModel.find({
                isActive: true
            })
            .sort({
                createdAt: 1
            })
            .lean();

        return res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// get all plan for admin
export const getAllPlans = async (req, res) => {
    try {
        const plans = await SubscriptionModel.find()
            .sort({
                createdAt: 1
            });

        return res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// get select plan
export const getSinglePlan = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan ID"
            });
        }

        const plan = await SubscriptionModel.findById(id).lean();

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: plan
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};