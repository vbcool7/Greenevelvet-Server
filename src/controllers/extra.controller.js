import crypto from "crypto";
import mongoose from "mongoose";
import ExtraPlanModel from "../models/extraplanModel.js";
import EscortModel from "../models/escortModel.js";
import subcribedModel from "../models/subcribedplanModel.js";
import axios from "axios";
import SubscriptionModel from "../models/subscriptionModel.js";

import ExtraPlanSubscriptionModel from "../models/extraPlanSubscriptionModel.js";




// create plan
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


// create Extra Plan Transaction
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

    //------------- AVAILABILITY -----------//

    if (plan.planType === "availability") {

        extraPayment.totalCredits = plan.totalSlots;

        extraPayment.remainingCredits = plan.totalSlots;

        extraPayment.isActive = true;

        await extraPayment.save();

        await EscortModel.findByIdAndUpdate(
            extraPayment.userId, {
                $addToSet: {
                    extraPlanSubscriptions: extraPayment._id
                }
            }
        );
        return;
    }

    //--------------- BOOST PROFILE -------------//

    if (plan.planType === "boost-profile") {

        const start = new Date();

        const expiry = new Date(start);

        expiry.setDate(expiry.getDate() + 30);

        extraPayment.subscriptionStart = start;

        extraPayment.subscriptionExpiry = expiry;

        extraPayment.isActive = true;
    }


    //------------- WEEKLY ELITE -------------//
    else if (
        plan.planType === "weekly-elite"
    ) {

        const start = new Date();

        const expiry = new Date(start);

        expiry.setDate(expiry.getDate() + 7);

        extraPayment.subscriptionStart = start;

        extraPayment.subscriptionExpiry = expiry;

        extraPayment.isActive = true;
    }

    //------------- MONTHLY ELITE -------------//
    else if (
        plan.planType === "monthly-elite"
    ) {

        const start = new Date();

        const expiry = new Date(start);

        expiry.setDate(expiry.getDate() + 30);

        extraPayment.subscriptionStart = start;

        extraPayment.subscriptionExpiry = expiry;

        extraPayment.isActive = true;
    }

    //------------- ATTACH TO ESCORT -------------//

    await extraPayment.save();

    await EscortModel.findByIdAndUpdate(
        extraPayment.userId, {
            $addToSet: {
                extraPlanSubscriptions: extraPayment._id
            }
        }
    );
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