import crypto from "crypto";
import mongoose from "mongoose";
import ExtraPlanModel from "../models/extraplanModel.js";
import EscortModel from "../models/escortModel.js";
import subcribedModel from "../models/subcribedplanModel.js";
import axios from "axios";
import SubscriptionModel from "../models/subscriptionModel.js";

import ExtraPlanSubscriptionModel from "../models/extraPlanSubscriptionModel.js";
import {
    response
} from "express";




//----------------------------- create plan ----------------------------//
export const createExtraPlan = async (request, response) => {
    try {
        const {
            iconName,
            title,
            discription,
            price,
            slug,
            duration,
            currency,
            totalSlots,
        } = request.body;

        // ✅ Basic validation
        if (!iconName || !title || !slug || !duration || price === undefined || !discription) {
            return response.status(400).json({
                message: "Required fields are missing",
                success: false,
                error: true
            });
        }

        const count = await ExtraPlanModel.countDocuments();
        if (count >= 4) {
            return response.status(400).json({
                message: "Only 4 plans allowed",
                success: false,
                error: true
            });
        }

        // ✅ Check duplicate slug
        const existing = await ExtraPlanModel.findOne({
            slug
        });
        if (existing) {
            return response.status(400).json({
                message: "Plan with this slug already exists",
                success: false,
                error: true
            });
        }

        // ✅ Create plan
        const plan = new ExtraPlanModel({
            iconName,
            title,
            discription,
            price,
            slug,
            duration,
            currency,
            totalSlots,
        });

        await plan.save();

        return response.status(201).json({
            message: "Plan created successfully",
            success: true,
            error: false,
            data: plan
        });

    } catch (error) {
        console.log("Create error", error);

        return response.status(500).json({
            message: error.message || "Sercer error",
            success: false,
            error: true
        });
    }
};

// update plan
export const updateExtraPlan = async (request, response) => {
    try {
        const {
            id
        } = request.params;

        // ✅ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid plan ID",
                success: false,
                error: true
            });
        }

        const {
            iconName,
            title,
            slug,
            duration,
            discription,
            price,
            currency,
            totalSlots,
            isActive
        } = request.body;

        // ✅ Check plan exist
        const existingPlan = await ExtraPlanModel.findById(id);

        if (!existingPlan) {
            return response.status(404).json({
                message: "Plan not found",
                success: false,
                error: true
            });
        }

        // ✅ Slug duplicate check (excluding current)
        if (slug) {
            const duplicate = await ExtraPlanModel.findOne({
                slug,
                _id: {
                    $ne: id
                }
            });

            if (duplicate) {
                return response.status(400).json({
                    message: "Slug already in use",
                    success: false,
                    error: true
                });
            }
        }

        // ✅ Update object (only passed fields)
        const updateData = {
            ...(iconName && {
                iconName
            }),
            ...(title && {
                title
            }),
            ...(slug && {
                slug
            }),
            ...(duration && {
                duration
            }),
            ...(price !== undefined && {
                price
            }),
            ...(discription !== undefined && {
                discription
            }),
            ...(currency && {
                currency
            }),
            ...(totalSlots !== undefined && {
                totalSlots
            }),
            ...(isActive !== undefined && {
                isActive
            })
        };

        const updatedPlan = await ExtraPlanModel.findByIdAndUpdate(
            id,
            updateData, {
                new: true
            }
        );

        return response.status(200).json({
            message: "Plan updated successfully",
            success: true,
            error: false,
            data: updatedPlan
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// get all plan for model
export const getAllActiveExtraPlans = async (request, response) => {
    try {
        const plans = await ExtraPlanModel.find({
                isActive: true
            })
            .sort({
                createdAt: 1
            })
            .lean();

        return response.status(200).json({
            message: "plans fetch successfull",
            success: true,
            count: plans.length,
            data: plans
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get all plan for admin
export const getAllExtraPlans = async (request, response) => {
    try {
        const plans = await ExtraPlanModel.find()
            .sort({
                createdAt: 1
            });

        return response.status(200).json({
            message: "Plan fetch successfull",
            success: true,
            count: plans.length,
            data: plans
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get selected plan
export const getSelectExtraPlan = async (request, response) => {
    try {
        const {
            id
        } = request.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid plan ID",
                success: false,
                error: true
            });
        }

        const plan = await ExtraPlanModel.findById(id).lean();

        if (!plan) {
            return response.status(404).json({
                message: "Plan not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Plan fetch successfully",
            success: true,
            error: false,
            data: plan
        });

    } catch (error) {
        console.log("Fetch select plan error", error.message);
        console.log(error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};


//-------------------------------- create Extra Plan Transaction -------------------------------------//
export const createExtraPlanTransaction = async (request, response) => {
    try {

        const userId = request?.user?._id;
        const {
            planId
        } = request?.body;

        // -----------------------------------------
        // Basic validation
        // -----------------------------------------

        if (!userId) {
            return response.status(400).json({
                message: "Id is required",
                success: false,
                error: true
            });
        }

        if (!planId) {
            return response.status(400).json({
                message: "PlanId is required",
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // Find Escort
        // -----------------------------------------

        const escort = await EscortModel.findById(userId);

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // Find Extra Plan
        // -----------------------------------------

        const plan = await ExtraPlanModel.findById(planId);

        if (!plan) {
            return response.status(404).json({
                message: "Extra plan not found",
                success: false,
                error: true
            });
        }

        if (!plan.isActive) {
            return response.status(400).json({
                message: "This extra plan is currently unavailable.",
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // Validate price
        // -----------------------------------------

        if (
            plan.price === null ||
            plan.price === undefined ||
            Number(plan.price) < 0
        ) {
            return response.status(400).json({
                message: "Invalid plan amount",
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // Check same plan already active
        // Availability is EXCLUDED
        // -----------------------------------------

        if (plan.planType !== "availability") {

            const existingSubscription =
                await ExtraPlanSubscriptionModel.findOne({
                    userId,
                    planId,
                    isActive: true,
                    subscriptionExpiry: {
                        $gt: new Date()
                    }
                });

            if (existingSubscription) {

                return response.status(400).json({
                    message: `You already have this ${plan.title} plan active.`,
                    success: false,
                    error: true,
                    type: "already_active",
                    subscription: existingSubscription
                });
            }
        }

        //------------------------------------------
        // Check active Payment Statuses
        //------------------------------------------

        const activePaymentStatuses = [
            "pending",
            "waiting",
            "confirming",
            "confirmed",
            "sending",
            "partially_paid"
        ];

        const existingPayment =
            await ExtraPlanSubscriptionModel.findOne({
                userId,
                planType: plan.planType,
                status: {
                    $in: activePaymentStatuses
                }
            });

        if (existingPayment) {
            return response.status(200).json({
                message: `You already have a payment in progress for ${existingPayment.planName}. Please complete it before purchasing this plan again.`,
                success: true,
                error: false,
                type: "payment_in_progress",
                transaction: existingPayment,
                paymentUrl: existingPayment.invoiceUrl,
            });
        }


        // -----------------------------------------
        // Create Order ID
        // -----------------------------------------

        const orderId =
            `EXTRA_${userId}_${plan._id}_${Date.now()}`;

        // -----------------------------------------
        // Free Extra Plan
        // -----------------------------------------

        if (Number(plan.price) === 0) {

            return response.status(400).json({
                message: `Free ${plan.title} plans are not supported.`,
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // NOWPayments payload
        // -----------------------------------------

        const successUrl =
            `${process.env.PAYMENT_SUCCESS_URL}?orderId=${encodeURIComponent(orderId)}`;

        const cancelUrl =
            `${process.env.PAYMENT_CANCEL_URL}?orderId=${encodeURIComponent(orderId)}`;

        const paymentData = {
            price_amount: Number(plan.price),
            price_currency: plan.currency || "AUD",
            order_id: orderId,
            order_description: `Extra Plan - ${plan.title}`,
            ipn_callback_url: process.env.NOWPAYMENTS_EXTRA_IPN_URL,
            success_url: successUrl,
            cancel_url: cancelUrl
        };

        // -----------------------------------------
        // Create NOWPayments invoice
        // -----------------------------------------

        const nowPaymentRes = await axios.post(
            `${process.env.NOWPAYMENTS_API_URL}/invoice`,
            paymentData, {
                headers: {
                    "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 30000
            }
        );

        console.log(
            "NOWPAYMENTS EXTRA PLAN RESPONSE:",
            nowPaymentRes.data
        );

        const paymentUrl =
            nowPaymentRes.data?.invoice_url;

        if (!paymentUrl) {
            return response.status(400).json({
                message: "Invoice URL not found in NOWPayments response.",
                success: false,
                error: true
            });
        }

        // -----------------------------------------
        // IMPORTANT
        // -----------------------------------------
        // Do NOT create ExtraPlanSubscriptionModel
        // record here.
        //
        // Record will be created/updated from webhook
        // after NOWPayments sends payment status.
        // -----------------------------------------

        return response.status(200).json({
            message: `Your ${plan.title} plan payment invoice has been created successfully. Please proceed to the payment page to complete your payment.`,
            success: true,
            error: false,
            type: "paid",
            orderId,
            nowPaymentsInvoiceId: nowPaymentRes.data?.id,
            paymentUrl
        });

    } catch (error) {

        console.log(
            "EXTRA PLAN PAYMENT ERROR:",
            error?.response?.data?.message ||
            error?.message
        );

        console.log(
            "EXTRA PLAN PAYMENT DETAILS:",
            JSON.stringify(
                error?.response?.data,
                null,
                2
            )
        );

        return response.status(500).json({
            message: "Failed to create extra plan transaction",
            success: false,
            error: true,
            details: error?.response?.data ||
                error?.message
        });
    }
};

// activate Extra Plan 
export const activateExtraPlan = async ({
    extraPayment,
    plan
}) => {

    // =========================================================
    // AVAILABILITY
    // =========================================================

    if (plan.planType === "availability") {

        extraPayment.totalCredits = plan.totalSlots;
        extraPayment.remainingCredits = plan.totalSlots;

        extraPayment.subscriptionStart = null;
        extraPayment.subscriptionExpiry = null;
        extraPayment.isActive = true;
    }

    // =========================================================
    // BOOST PROFILE
    // =========================================================
    else if (plan.planType === "boost-profile") {

        extraPayment.totalCredits = plan.totalSlots;
        extraPayment.remainingCredits = plan.totalSlots;

        // No expiry
        extraPayment.subscriptionStart = null;
        extraPayment.subscriptionExpiry = null;
        extraPayment.isActive = true;
    }

    // =========================================================
    // WEEKLY ELITE
    // =========================================================
    else if (plan.planType === "weekly-elite") {

        // Purchased but NOT started yet
        extraPayment.totalCredits = plan.totalSlots;
        extraPayment.remainingCredits = plan.totalSlots;

        extraPayment.subscriptionStart = null;
        extraPayment.subscriptionExpiry = null;

        extraPayment.isActive = true;
    }

    // =========================================================
    // MONTHLY ELITE
    // =========================================================
    else if (plan.planType === "monthly-elite") {

        // Purchased but NOT started yet
        extraPayment.totalCredits = plan.totalSlots;
        extraPayment.remainingCredits = plan.totalSlots;

        extraPayment.subscriptionStart = null;
        extraPayment.subscriptionExpiry = null;

        extraPayment.isActive = true;
    }

    // =========================================================
    // ATTACH TO ESCORT
    // =========================================================

    await extraPayment.save();

    const escortUpdate = {
        $addToSet: {
            extraPlanSubscriptions: extraPayment._id
        }
    };

    // Availability: add purchased credits 
    if (plan.planType === "availability") {
        escortUpdate.$inc = {
            "availability.totalAvailability": plan.totalSlots
        };
    }

    // Boost Profile: add purchased boost credits 
    else if (plan.planType === "boost-profile") {
        escortUpdate.$inc = {
            "boost.totalBoost": plan.totalSlots,
            "boost.extraPlanBoost": plan.totalSlots
        };
    }

    // Weekly Elite: add purchased credits 
    else if (plan.planType === "weekly-elite") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        escortUpdate.$inc = {
            "weeklyElite.totalWeeklyElite": plan.totalSlots
        };

        escortUpdate.$set = {
            "weeklyElite.weeklyEliteExpiry": expiryDate
        };
    }


    // Monthly Elite: add purchased credits 
    else if (plan.planType === "monthly-elite") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        escortUpdate.$inc = {
            "monthlyElite.totalMonthlyElite": plan.totalSlots
        };

        escortUpdate.$set = {
            "monthlyElite.monthlyEliteExpiry": expiryDate
        };
    }

    const updatedEscort = await EscortModel.findByIdAndUpdate(
        extraPayment.userId, escortUpdate, {
            new: true,
        });


    if (!updatedEscort) {
        throw new Error("Escort not found while activating extra plan");
    }
};


// extra nowPayment webHook call
export const extranowPaymentsWebhook = async (request, response) => {

    try {
        //------------- 1. GET WEBHOOK EVENT -------------//
        const event = request.body;

        console.log("EXTRA NOWPAYMENTS WEBHOOK REQUEST BODY:", event);

        const {
            invoice_id,
            payment_id,
            payment_status,
            pay_amount,
            pay_currency,
            order_id,
            purchase_id
        } = event;

        //------------- 2. BASIC VALIDATION -------------//

        if (!order_id || !payment_status) {

            console.log("EXTRA WEBHOOK: order_id or payment_status missing");

            return response.sendStatus(400);
        }

        //------------- 3. ONLY EXTRA PLAN ORDER -------------//

        if (!order_id.startsWith("EXTRA_")) {

            console.log("EXTRA WEBHOOK: Invalid order type", order_id);

            return response.sendStatus(400);
        }

        //------------- 4. EXTRACT USER ID & PLAN ID -------------//

        const orderParts = order_id.split("_");
        const userId = orderParts[1];
        const planId = orderParts[2];

        if (!userId || !planId) {

            console.log("Invalid extra plan order ID:", order_id);

            return response.sendStatus(400);
        }

        //------------- 5. FIND ESCORT -------------//

        const escort =
            await EscortModel.findById(userId);

        if (!escort) {

            console.log("Escort not found:", userId);

            return response.sendStatus(404);
        }

        //------------- 6. FIND EXTRA PLAN -------------//

        const plan =
            await ExtraPlanModel.findById(planId);

        if (!plan) {

            console.log("Extra plan not found:", planId);

            return response.sendStatus(404);
        }

        //------------- 7. INVOICE URL -------------//

        const invoiceUrl = invoice_id ?
            `https://nowpayments.io/payment?iid=${invoice_id}` :
            null;


        //------------- 8. PAYMENT STATUS -------------//

        const successfulStatus = "finished";

        const failedStatuses = [
            "failed",
            "expired",
            "refunded"
        ];

        //------------- 9. FIND EXISTING PAYMENT -------------//

        let payment =
            await ExtraPlanSubscriptionModel.findOne({
                orderId: order_id
            });

        //------------- 10. EXISTING PAYMENT -------------//

        if (payment) {

            //------------- Duplicate webhook -------------//

            if (
                payment.status === payment_status &&
                payment.paymentId ===
                String(payment_id || "")
            ) {

                console.log("Duplicate extra plan webhook:", order_id, payment_status);

                return response.sendStatus(200);
            }

            //------------- UPDATE PAYMENT DATA -------------//

            payment.status = payment_status;

            if (invoice_id) {
                payment.nowPaymentInvoiceId = String(invoice_id);
            }

            if (invoiceUrl) {
                payment.invoiceUrl = invoiceUrl;
            }

            if (payment_id) {
                payment.paymentId = String(payment_id);
            }

            if (pay_amount !== undefined) {
                payment.payAmount = String(pay_amount);
            }

            if (pay_currency) {
                payment.payCurrency = pay_currency;
            }

            if (purchase_id) {
                payment.purchaseId = String(purchase_id);
            }

            //------------- FINAL PAYMENT SUCCESS -------------//

            if (payment_status === successfulStatus) {

                // activateExtraPlan handles:
                //
                // availability
                // OR
                // boost-profile
                // weekly-elite
                // monthly-elite

                await activateExtraPlan({
                    extraPayment: payment,
                    plan
                });

            }

            //------------- FAILED PAYMENT -------------//

            if (failedStatuses.includes(payment_status)) {

                payment.isActive = false;

                await payment.save();
            }

            //------------- SAVE PROCESSING STATUS -------------//

            if (payment_status !== successfulStatus && !failedStatuses.includes(payment_status)) {

                await payment.save();
            }

            console.log("Extra plan payment updated:", order_id, payment_status);

            return response.sendStatus(200);
        }

        //------------- 11. CREATE NEW PAYMENT RECORD -( yaha par hume plan k accourding expiry update karna h )------------//

        payment =
            await ExtraPlanSubscriptionModel.create({

                userId,
                planId: plan._id,
                planType: plan.planType,
                planName: plan.title,
                title: plan.title,
                price: plan.price,
                amount: plan.price,
                currency: plan.currency || "AUD",
                duration: plan.duration,
                totalSlots: plan.totalSlots,
                nowPaymentInvoiceId: invoice_id ? String(invoice_id) : undefined,
                invoiceUrl,
                orderId: order_id,
                paymentId: payment_id ? String(payment_id) : undefined,
                payAmount: pay_amount !== undefined ? String(pay_amount) : undefined,
                payCurrency: pay_currency || undefined,
                purchaseId: purchase_id ? String(purchase_id) : undefined,
                status: payment_status,
                isActive: false
            });

        //------------- 12. NEW PAYMENT - SUCCESS -------------//

        if (payment_status === successfulStatus) {

            await activateExtraPlan({
                extraPayment: payment,
                plan
            });
        }

        //------------- 13. NEW PAYMENT - FAILED -------------//
        else if (failedStatuses.includes(payment_status)) {

            payment.isActive = false;

            await payment.save();
        }

        //------------- 14. PROCESSING PAYMENT -------------//

        /*
            pending
            waiting
            confirming
            confirmed
            sending
            partially_paid

            Record already created above.

            isActive remains false.
        */

        console.log("Extra plan payment created:", order_id, payment_status);

        return response.sendStatus(200);

    } catch (error) {

        console.log("EXTRA NOWPAYMENTS WEBHOOK ERROR:");

        console.log(error?.response?.data || error?.message);

        return response.sendStatus(500);
    }
};


// Fetch escort's active/usable purchased extra plans
export const fetchEscortExtraPurchasePlan = async (request, response) => {
    try {
        const userId = request?.user?._id;

        // ===================== AUTH CHECK =====================

        if (!userId) {
            return response.status(401).json({
                message: "User not authenticated",
                success: false,
                error: true
            });
        }

        // ===================== FETCH ESCORT =====================

        const escort = await EscortModel
            .findById(userId)
            .populate("extraPlanSubscriptions");

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        const extraPlans = escort.extraPlanSubscriptions || [];

        const now = new Date();

        // ===================== FILTER ACTIVE PLANS =====================

        const activeExtraPlans = extraPlans.filter((plan) => {

            if (!plan.isActive) {
                return false;
            }

            if ((plan.remainingCredits || 0) <= 0) {
                return false;
            }

            // ================= BOOST =================

            if (plan.planType === "boost-profile") {
                return true;
            }

            // ================= AVAILABILITY =================

            if (plan.planType === "availability") {
                return true;
            }

            // ================= WEEKLY ELITE =================

            if (plan.planType === "weekly-elite") {

                // subscriptionStart null hai
                if (!plan.subscriptionStart) {
                    return true;
                }

                if (
                    plan.subscriptionExpiry &&
                    new Date(plan.subscriptionExpiry) <= now
                ) {
                    return false;
                }

                return true;
            }

            // ================= MONTHLY ELITE =================

            if (plan.planType === "monthly-elite") {

                if (!plan.subscriptionStart) {
                    return true;
                }

                if (
                    plan.subscriptionExpiry &&
                    new Date(plan.subscriptionExpiry) <= now
                ) {
                    return false;
                }

                return true;
            }

            return false;
        });

        // ===================== NO ACTIVE PLAN =====================

        if (activeExtraPlans.length === 0) {
            return response.status(200).json({
                message: "No active extra plans found",
                success: true,
                error: false,
                status: "no_active_extra_subscription",
                data: []
            });
        }

        // ===================== SUCCESS =====================

        return response.status(200).json({
            message: "Active extra plans fetched successfully",
            success: true,
            error: false,
            data: activeExtraPlans
        });

    } catch (error) {

        console.error(
            "FETCH ESCORT ACTIVE EXTRA PLAN ERROR:",
            error?.message
        );

        return response.status(500).json({
            message: "Failed to fetch active extra plan subscriptions",
            success: false,
            error: true
        });
    }
};


// fetch Escort My All Purchased Extra Plan

export const fetchEscortAllPurchasedExtraPlan = async (request, response) => {
    try {
        const userId = request?.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "User not authenticated",
                success: false,
                error: true
            });
        }

        const {
            planType,
            planName,
            currency,
            isActive,
            status,
            subscriptionStatus,
            availabilityStatus,
            subscriptionStartFrom,
            subscriptionStartTo,
            subscriptionExpiryFrom,
            subscriptionExpiryTo,
            availabilityStartFrom,
            availabilityStartTo,
            availabilityEndFrom,
            availabilityEndTo,
            sortBy = "newest",
            page = 1,
            limit = 10,
        } = request.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(
            Math.max(Number(limit) || 10, 1),
            100
        );

        const skip = (pageNumber - 1) * limitNumber;

        const query = {
            userId: new mongoose.Types.ObjectId(userId)
        };

        // Plan Type
        if (
            planType &&
            planType !== "all" &&
            planType !== "undefined"
        ) {
            query.planType = planType;
        }

        // Plan Name
        if (
            planName &&
            planName !== "all" &&
            planName !== "undefined"
        ) {
            query.planName = planName;
        }

        // Currency
        if (
            currency &&
            currency !== "all" &&
            currency !== "undefined"
        ) {
            query.currency = currency;
        }

        // Active / Inactive
        if (
            isActive !== undefined &&
            isActive !== "" &&
            isActive !== "all" &&
            isActive !== "undefined"
        ) {
            query.isActive = isActive === "true";
        }

        // Payment / Subscription Status
        if (
            status &&
            status !== "all" &&
            status !== "undefined"
        ) {
            query.status = status;
        }

        // Subscription Status
        if (
            subscriptionStatus &&
            subscriptionStatus !== "all" &&
            subscriptionStatus !== "undefined"
        ) {
            const currentDate = new Date();

            if (subscriptionStatus === "active") {
                query.subscriptionExpiry = {
                    $gte: currentDate
                };
            }

            if (subscriptionStatus === "expired") {
                query.subscriptionExpiry = {
                    $lt: currentDate
                };
            }

            if (subscriptionStatus === "no_expiry") {
                query.$or = [{
                        subscriptionExpiry: null
                    },
                    {
                        subscriptionExpiry: {
                            $exists: false
                        }
                    }
                ];
            }
        }

        // Availability Status
        if (
            availabilityStatus &&
            availabilityStatus !== "all" &&
            availabilityStatus !== "undefined"
        ) {
            const currentDate = new Date();

            if (availabilityStatus === "active") {
                query.availabilityActive = true;
                query.availabilityEnd = {
                    $gte: currentDate
                };
            }

            if (availabilityStatus === "inactive") {
                query.availabilityActive = false;
            }

            if (availabilityStatus === "expired") {
                query.availabilityEnd = {
                    $lt: currentDate
                };
            }
        }

        // Subscription Start Date
        if (subscriptionStartFrom || subscriptionStartTo) {
            query.subscriptionStart = {};

            if (subscriptionStartFrom) {
                query.subscriptionStart.$gte = new Date(
                    subscriptionStartFrom
                );
            }

            if (subscriptionStartTo) {
                const endDate = new Date(subscriptionStartTo);
                endDate.setHours(23, 59, 59, 999);

                query.subscriptionStart.$lte = endDate;
            }
        }

        // Subscription Expiry Date
        if (subscriptionExpiryFrom || subscriptionExpiryTo) {
            query.subscriptionExpiry = {};

            if (subscriptionExpiryFrom) {
                query.subscriptionExpiry.$gte = new Date(
                    subscriptionExpiryFrom
                );
            }

            if (subscriptionExpiryTo) {
                const endDate = new Date(subscriptionExpiryTo);
                endDate.setHours(23, 59, 59, 999);

                query.subscriptionExpiry.$lte = endDate;
            }
        }

        // Availability Start Date
        if (availabilityStartFrom || availabilityStartTo) {
            query.availabilityStart = {};

            if (availabilityStartFrom) {
                query.availabilityStart.$gte = new Date(
                    availabilityStartFrom
                );
            }

            if (availabilityStartTo) {
                const endDate = new Date(availabilityStartTo);
                endDate.setHours(23, 59, 59, 999);

                query.availabilityStart.$lte = endDate;
            }
        }

        // Availability End Date
        if (availabilityEndFrom || availabilityEndTo) {
            query.availabilityEnd = {};

            if (availabilityEndFrom) {
                query.availabilityEnd.$gte = new Date(
                    availabilityEndFrom
                );
            }

            if (availabilityEndTo) {
                const endDate = new Date(availabilityEndTo);
                endDate.setHours(23, 59, 59, 999);

                query.availabilityEnd.$lte = endDate;
            }
        }

        // Sorting
        let sortOptions = {
            createdAt: -1
        };

        switch (sortBy) {
            case "oldest":
                sortOptions = {
                    createdAt: 1
                };
                break;

            case "price_high":
                sortOptions = {
                    price: -1,
                    createdAt: -1
                };
                break;

            case "price_low":
                sortOptions = {
                    price: 1,
                    createdAt: -1
                };
                break;

            case "newest":
            default:
                sortOptions = {
                    createdAt: -1
                };
                break;

            case "start_newest":
                sortOptions = {
                    subscriptionStart: -1
                };
                break;

            case "start_oldest":
                sortOptions = {
                    subscriptionStart: 1
                };
                break;

            case "expiry_latest":
                sortOptions = {
                    subscriptionExpiry: -1
                };
                break;

            case "expiry_soonest":
                sortOptions = {
                    subscriptionExpiry: 1
                };
                break;

            case "availability_latest":
                sortOptions = {
                    availabilityEnd: -1
                };
                break;

            case "availability_soonest":
                sortOptions = {
                    availabilityEnd: 1
                };
                break;
        }

        const aggregationPipeline = [{
                $match: query
            },
            {
                $sort: sortOptions
            },
            {
                $facet: {
                    plans: [{
                            $skip: skip
                        },
                        {
                            $limit: limitNumber
                        }
                    ],
                    totalCount: [{
                        $count: "count"
                    }]
                }
            }
        ];

        const result = await ExtraPlanSubscriptionModel.aggregate(
            aggregationPipeline
        );

        const plans = result?. [0]?.plans || [];

        const totalPlans =
            result?. [0]?.totalCount?. [0]?.count || 0;

        const totalPages =
            Math.ceil(totalPlans / limitNumber) || 1;

        return response.status(200).json({
            message: "All purchased extra plans fetched successfully",
            success: true,
            error: false,
            data: plans,
            pagination: {
                totalFilteredPlans: totalPlans,
                currentPage: pageNumber,
                totalPages,
                limit: limitNumber,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1
            }
        });

    } catch (error) {
        console.log(
            "FETCH ESCORT ALL PURCHASED EXTRA PLANS ERROR:",
            error?.message
        );

        return response.status(500).json({
            message: "Failed to fetch purchased extra plans",
            success: false,
            error: true,
            details: error?.message
        });
    }
};


// Admin Fetch all purchased extra plans
export const getAllPurchasedExtraPlans = async (request, response) => {
    try {
        const {
            page = 1,
                limit = 10,
                search = "",
                planType,
                planName,
                currency,
                isActive,
                status,
                subscriptionStatus,
                availabilityStatus,
                subscriptionStartFrom,
                subscriptionStartTo,
                subscriptionExpiryFrom,
                subscriptionExpiryTo,
                availabilityStartFrom,
                availabilityStartTo,
                availabilityEndFrom,
                availabilityEndTo,
                sortBy = "newest",
        } = request.query;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};

        if (planType && planType !== "all" && planType !== "undefined") {
            query.planType = planType;
        }

        if (planName && planName !== "all" && planName !== "undefined") {
            query.planName = planName;
        }

        if (currency && currency !== "all" && currency !== "undefined") {
            query.currency = currency;
        }

        if (
            isActive !== undefined &&
            isActive !== "" &&
            isActive !== "all" &&
            isActive !== "undefined"
        ) {
            query.isActive = isActive === "true";
        }

        if (status && status !== "all" && status !== "undefined") {
            query.status = status;
        }

        if (subscriptionStatus && subscriptionStatus !== "all" && subscriptionStatus !== "undefined") {
            const currentDate = new Date();

            if (subscriptionStatus === "active") {
                query.subscriptionExpiry = {
                    $gte: currentDate
                };
            }

            if (subscriptionStatus === "expired") {
                query.subscriptionExpiry = {
                    $lt: currentDate
                };
            }

            if (subscriptionStatus === "no_expiry") {
                query.$or = [{
                        subscriptionExpiry: null
                    },
                    {
                        subscriptionExpiry: {
                            $exists: false
                        }
                    }
                ];
            }
        }

        if (availabilityStatus && availabilityStatus !== "all" && availabilityStatus !== "undefined") {
            const currentDate = new Date();

            if (availabilityStatus === "active") {
                query.availabilityActive = true;
                query.availabilityEnd = {
                    $gte: currentDate
                };
            }

            if (availabilityStatus === "inactive") {
                query.availabilityActive = false;
            }

            if (availabilityStatus === "expired") {
                query.availabilityEnd = {
                    $lt: currentDate
                };
            }
        }

        if (subscriptionStartFrom || subscriptionStartTo) {
            query.subscriptionStart = {};

            if (subscriptionStartFrom) {
                query.subscriptionStart.$gte = new Date(subscriptionStartFrom);
            }

            if (subscriptionStartTo) {
                const endDate = new Date(subscriptionStartTo);
                endDate.setHours(23, 59, 59, 999);
                query.subscriptionStart.$lte = endDate;
            }
        }

        if (subscriptionExpiryFrom || subscriptionExpiryTo) {
            query.subscriptionExpiry = {};

            if (subscriptionExpiryFrom) {
                query.subscriptionExpiry.$gte = new Date(subscriptionExpiryFrom);
            }

            if (subscriptionExpiryTo) {
                const endDate = new Date(subscriptionExpiryTo);
                endDate.setHours(23, 59, 59, 999);
                query.subscriptionExpiry.$lte = endDate;
            }
        }

        if (availabilityStartFrom || availabilityStartTo) {
            query.availabilityStart = {};

            if (availabilityStartFrom) {
                query.availabilityStart.$gte = new Date(availabilityStartFrom);
            }

            if (availabilityStartTo) {
                const endDate = new Date(availabilityStartTo);
                endDate.setHours(23, 59, 59, 999);
                query.availabilityStart.$lte = endDate;
            }
        }

        if (availabilityEndFrom || availabilityEndTo) {
            query.availabilityEnd = {};

            if (availabilityEndFrom) {
                query.availabilityEnd.$gte = new Date(availabilityEndFrom);
            }

            if (availabilityEndTo) {
                const endDate = new Date(availabilityEndTo);
                endDate.setHours(23, 59, 59, 999);
                query.availabilityEnd.$lte = endDate;
            }
        }

        const aggregationPipeline = [{
                $match: query
            },

            {
                $lookup: {
                    from: "escorts",
                    localField: "userId",
                    foreignField: "_id",
                    as: "escort"
                }
            },

            {
                $unwind: {
                    path: "$escort",
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        if (search) {
            aggregationPipeline.push({
                $match: {
                    $or: [{
                            "escort.name": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            "escort.email": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            "escort.escortId": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            planName: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            orderId: {
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            });
        }

        let sortOptions = {
            createdAt: -1
        };

        switch (sortBy) {
            case "oldest":
                sortOptions = {
                    createdAt: 1
                };
                break;

            case "price_high":
                sortOptions = {
                    price: -1,
                    createdAt: -1
                };
                break;

            case "price_low":
                sortOptions = {
                    price: 1,
                    createdAt: -1
                };
                break;

            case "start_newest":
                sortOptions = {
                    subscriptionStart: -1
                };
                break;

            case "start_oldest":
                sortOptions = {
                    subscriptionStart: 1
                };
                break;

            case "expiry_latest":
                sortOptions = {
                    subscriptionExpiry: -1
                };
                break;

            case "expiry_soonest":
                sortOptions = {
                    subscriptionExpiry: 1
                };
                break;

            case "availability_latest":
                sortOptions = {
                    availabilityEnd: -1
                };
                break;

            case "availability_soonest":
                sortOptions = {
                    availabilityEnd: 1
                };
                break;

            case "newest":
            default:
                sortOptions = {
                    createdAt: -1
                };
                break;
        }

        aggregationPipeline.push({
            $facet: {
                plans: [{
                        $sort: sortOptions
                    },
                    {
                        $skip: skip
                    },
                    {
                        $limit: limitNumber
                    }
                ],
                totalCount: [{
                    $count: "count"
                }]
            }
        });

        const result = await ExtraPlanSubscriptionModel.aggregate(
            aggregationPipeline
        );

        const plans = result?. [0]?.plans || [];
        const totalPlans = result?. [0]?.totalCount?. [0]?.count || 0;
        const totalPages = Math.ceil(totalPlans / limitNumber) || 1;

        return response.status(200).json({
            message: "All purchased extra plans fetched successfully",
            success: true,
            error: false,
            data: plans,
            pagination: {
                total: totalPlans,
                page: pageNumber,
                limit: limitNumber,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPreviousPage: pageNumber > 1
            }
        });

    } catch (error) {
        console.log(
            "GET ALL PURCHASED EXTRA PLANS ERROR:",
            error?.message
        );

        return response.status(500).json({
            message: "Failed to fetch purchased extra plans",
            success: false,
            error: true,
            details: error?.message
        });
    }
};


//-----------------------Test controller -----------------------//

export const oneTimeUpdateEscort = async (req, res) => {

    const subscriptionStart = new Date();

    const updatedEscort = await EscortModel.updateOne({
        escortId: "ES-162"
    }, {
        $set: {
            // Availability
            "availability.totalAvailability": 10,
            "availability.availabilityStart": null,
            "availability.availabilityEnd": null,

            // Boost
            "boost.totalBoost": 15,
            "boost.extraPlanBoost": 10,
            "boost.subscriptionPlanBoost": 5,
            "boost.subscriptionPlanBoostExpiry": new Date(subscriptionStart.getTime() + 28 * 24 * 60 * 60 * 1000),

            "boost.boostCycleDays": 28,
            "boost.profileBoostExpiry": null,

            // Weekly Elite
            "weeklyElite.totalWeeklyElite": 1,
            "weeklyElite.weeklyEliteExpiry": new Date(subscriptionStart.getTime() + 7 * 24 * 60 * 60 * 1000),

            // Monthly Elite
            "monthlyElite.totalMonthlyElite": 1,
            "monthlyElite.monthlyEliteExpiry": new Date(subscriptionStart.getTime() + 30 * 24 * 60 * 60 * 1000),
        }
    });

    return res.status(200).json({
        success: true,
        message: "Escort ES-162 updated successfully",
        result: updatedEscort
    });
}




//------------------------------------------------------------------//
//----------------- Active Extra Plan Controller -------------------//
//------------------------------------------------------------------//

// Manual Boost Profile , fetch data from escort db 
export const manualProfileBoost = async (request, response) => {
    try {
        const userId = request?.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "User not authenticated",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findById(userId);

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }


        // =====================================================
        // MANUAL BOOST - EXTRA PLAN ONLY
        // =====================================================

        const extraBoosts = Number(
            escort.boost?.extraPlanBoost || 0
        );

        const totalBoosts = Number(
            escort.boost?.totalBoost || 0
        );

        if (extraBoosts <= 0 || totalBoosts <= 0) {
            return response.status(400).json({
                message: "No extra boosts available. Please purchase a boost.",
                success: false,
                error: true
            });
        }

        // =====================================================
        // DEDUCT EXTRA BOOST
        // =====================================================

        escort.boost.extraPlanBoost = extraBoosts - 1;
        escort.boost.totalBoost = totalBoosts - 1;
        escort.boost.profileBoostExpiry = null;

        // Keep existing boost fields in sync
        escort.boostSource = "extra";
        escort.isBoosted = true;
        escort.boostedAt = new Date();
        escort.boostExpiry = null;

        await escort.save();

        return response.status(200).json({
            message: "Profile boosted successfully",
            success: true,
            error: false,
            boostSource: "extra",
            remainingBoosts: escort.boost.extraPlanBoost,
            totalBoosts: escort.boost.totalBoost,
        });

    } catch (error) {
        console.error(
            "PROFILE BOOST ERROR:",
            error?.message
        );

        return response.status(500).json({
            message: "Failed to boost your profile",
            success: false,
            error: true
        });
    }
};


// Manual activate availability 
export const startAvailability = async (request, response) => {
    try {
        const userId = request?.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "User not authenticated",
                success: false,
                error: true
            });
        }

        const now = new Date();
        const availabilityEnd = new Date(
            now.getTime() + 30 * 60 * 1000
        );

        const escort = await EscortModel.findOneAndUpdate({
            _id: userId,
            "availability.totalAvailability": {
                $gt: 0
            },
            $or: [{
                    "availability.availabilityEnd": null
                },
                {
                    "availability.availabilityEnd": {
                        $lte: now
                    }
                }
            ]
        }, {
            $inc: {
                "availability.totalAvailability": -1
            },
            $set: {
                "availability.availabilityStart": now,
                "availability.availabilityEnd": availabilityEnd
            }
        }, {
            new: true
        });

        if (!escort) {
            return response.status(400).json({
                message: "No availability slots available or availability is already active",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "You are now available for 30 minutes",
            success: true,
            error: false,
            totalAvailability: escort.availability.totalAvailability,
            availabilityStart: escort.availability.availabilityStart,
            availabilityEnd: escort.availability.availabilityEnd
        });

    } catch (error) {
        console.error("START AVAILABILITY ERROR:", error?.message);

        return response.status(500).json({
            message: "Failed to start availability",
            success: false,
            error: true
        });
    }
};