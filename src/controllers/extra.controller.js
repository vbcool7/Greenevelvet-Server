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
            return response.status(400).json({
                message: `You already have a payment in progress for ${existingPayment.planName}. Please complete it before purchasing this plan again.`,
                success: false,
                error: true,
                type: "payment_in_progress",
                transaction: existingPayment,
                paymentUrl: existingPayment.invoiceUrl,
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

        const paymentData = {
            price_amount: Number(plan.price),
            price_currency: plan.currency || "AUD",
            order_id: orderId,
            order_description: `Extra Plan - ${plan.title}`,
            ipn_callback_url: process.env.NOWPAYMENTS_EXTRA_IPN_URL,
            success_url: process.env.PAYMENT_SUCCESS_URL,
            cancel_url: process.env.PAYMENT_CANCEL_URL
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
            message: `Your ${plan.title} plan payment has been created successfully. Please proceed to the payment page to complete your payment.`,
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


// ACTIVATE EXTRA PLAN
const activateExtraPlan = async ({
    extraPayment,
    plan,
    escort
}) => {

    const start = new Date();


    // ==================================================
    // AVAILABILITY
    // ==================================================

    if (plan.planType === "availability") {

        const credits =
            Number(plan.totalSlots || 0);


        extraPayment.totalCredits =
            credits;

        extraPayment.remainingCredits =
            credits;

        extraPayment.availabilityActive =
            false;

        extraPayment.availabilityStart =
            null;

        extraPayment.availabilityEnd =
            null;

        extraPayment.isActive =
            true;


        /*
            Availability is credit based.

            There is NO subscriptionStart
            and NO subscriptionExpiry.
        */


        return;
    }


    // ==================================================
    // NORMAL EXTRA PLAN
    // ==================================================

    let days = 30;

    if (plan.duration) {

        const match =
            plan.duration.match(/\d+/);

        if (match) {
            days = Number(match[0]);
        }
    }


    const expiry = new Date(
        start.getTime() +
        days * 24 * 60 * 60 * 1000
    );


    extraPayment.subscriptionStart =
        start;

    extraPayment.subscriptionExpiry =
        expiry;

    extraPayment.isActive =
        true;
};

// NOWPAYMENTS WEBHOOK
export const extranowPaymentsWebhook = async (request, response) => {
    try {

        console.log("EXTRA NOWPAYMENTS WEBHOOK:", request.body);

        // ==================================================
        // 1. VERIFY WEBHOOK SIGNATURE
        // ==================================================

        const signature = request.headers["x-nowpayments-sig"];

        /*
         IMPORTANT:

         For proper signature verification, your Express route
         should receive the raw body.

         Example:

         app.post(
             "/nowpayments/webhook",
             express.raw({ type: "application/json" }),
             nowPaymentsWebhook
         );

         Then use request.body as Buffer here.
        */

        if (signature && process.env.NOWPAYMENTS_IPN_SECRET) {

            const rawBody = request.body;

            const expectedSignature = crypto
                .createHmac(
                    "sha512",
                    process.env.NOWPAYMENTS_IPN_SECRET
                )
                .update(rawBody)
                .digest("hex");

            if (signature !== expectedSignature) {

                console.log(
                    "NOWPAYMENTS WEBHOOK: Invalid signature"
                );

                return response.sendStatus(401);
            }
        }


        // ==================================================
        // 2. GET EVENT DATA
        // ==================================================

        let event;

        if (Buffer.isBuffer(request.body)) {
            event = JSON.parse(request.body.toString());
        } else {
            event = request.body;
        }

        console.log(
            "NOWPAYMENTS WEBHOOK EVENT:",
            JSON.stringify(event, null, 2)
        );


        const {
            invoice_id,
            payment_id,
            payment_status,
            pay_amount,
            pay_currency,
            order_id,
            purchase_id
        } = event;


        // ==================================================
        // 3. BASIC VALIDATION
        // ==================================================

        if (!order_id || !payment_status) {

            console.log(
                "NOWPAYMENTS WEBHOOK: order_id or payment_status missing"
            );

            return response.sendStatus(400);
        }


        // ==================================================
        // 4. IDENTIFY ORDER TYPE
        // ==================================================

        const isSubscriptionOrder =
            order_id.startsWith("SUB_");

        const isExtraPlanOrder =
            order_id.startsWith("EXTRA_");


        if (!isSubscriptionOrder && !isExtraPlanOrder) {

            console.log(
                "NOWPAYMENTS WEBHOOK: Unknown order type",
                order_id
            );

            return response.sendStatus(400);
        }


        // ==================================================
        // 5. COMMON PAYMENT STATUSES
        // ==================================================

        const intermediateStatuses = [
            "pending",
            "waiting",
            "confirming",
            "confirmed",
            "sending",
            "partially_paid"
        ];

        const successfulStatus = "finished";

        const failedStatuses = [
            "failed",
            "expired",
            "refunded"
        ];


        // ==================================================
        // 6. SUBSCRIPTION PLAN
        // ==================================================

        if (isSubscriptionOrder) {

            /*
                Format:

                SUB_USERID_PLANID_TIMESTAMP
            */

            const orderParts = order_id.split("_");

            const userId = orderParts[1];
            const planId = orderParts[2];


            if (!userId || !planId) {

                console.log(
                    "Invalid subscription order ID:",
                    order_id
                );

                return response.sendStatus(400);
            }


            // ----------------------------------------------
            // Find Escort
            // ----------------------------------------------

            const escort =
                await EscortModel.findById(userId);

            if (!escort) {

                console.log(
                    "Escort not found:",
                    userId
                );

                return response.sendStatus(404);
            }


            // ----------------------------------------------
            // Find Subscription Plan
            // ----------------------------------------------

            const plan =
                await SubscriptionModel.findById(planId);

            if (!plan) {

                console.log(
                    "Subscription plan not found:",
                    planId
                );

                return response.sendStatus(404);
            }


            // ----------------------------------------------
            // Invoice URL
            // ----------------------------------------------

            const invoiceUrl = invoice_id ?
                `https://nowpayments.io/payment?iid=${invoice_id}` :
                null;


            // ----------------------------------------------
            // Find Existing Transaction
            // ----------------------------------------------

            let payment =
                await subcribedModel.findOne({
                    orderId: order_id
                });


            // ==================================================
            // EXISTING PAYMENT
            // ==================================================

            if (payment) {

                // ------------------------------------------
                // Duplicate webhook protection
                // ------------------------------------------

                if (
                    payment.status === payment_status &&
                    payment.paymentId === String(payment_id || "")
                ) {

                    console.log(
                        "Duplicate subscription webhook:",
                        order_id,
                        payment_status
                    );

                    return response.sendStatus(200);
                }


                // ------------------------------------------
                // Update Payment Data
                // ------------------------------------------

                payment.status = payment_status;

                payment.nowPaymentInvoiceId =
                    invoice_id ?
                    String(invoice_id) :
                    payment.nowPaymentInvoiceId;

                payment.invoiceUrl =
                    invoiceUrl || payment.invoiceUrl;

                payment.paymentId =
                    payment_id ?
                    String(payment_id) :
                    payment.paymentId;

                payment.payAmount =
                    pay_amount !== undefined ?
                    String(pay_amount) :
                    payment.payAmount;

                payment.payCurrency =
                    pay_currency || payment.payCurrency;

                if (purchase_id) {
                    payment.purchaseId = String(purchase_id);
                }


                // ------------------------------------------
                // FINAL PAYMENT SUCCESS
                // ------------------------------------------

                if (payment_status === successfulStatus) {

                    const start = new Date();

                    let days = 30;

                    if (payment.duration) {

                        const match =
                            payment.duration.match(/\d+/);

                        if (match) {
                            days = Number(match[0]);
                        }
                    }


                    const expiry = new Date(
                        start.getTime() +
                        days * 24 * 60 * 60 * 1000
                    );


                    payment.subscriptionStart = start;
                    payment.subscriptionExpiry = expiry;
                    payment.isActive = true;


                    await EscortModel.findByIdAndUpdate(
                        userId, {
                            subscriptionActive: true,
                            subscriptionStatus: "active",
                            subscriptionplanexpiry: expiry,

                            $addToSet: {
                                subscribedplans: payment._id
                            }
                        }
                    );
                }


                // ------------------------------------------
                // Failed / Expired / Refunded
                // ------------------------------------------

                if (failedStatuses.includes(payment_status)) {

                    payment.isActive = false;
                }


                await payment.save();


                console.log(
                    "Subscription payment updated:",
                    order_id,
                    payment_status
                );


                return response.sendStatus(200);
            }


            // ==================================================
            // CREATE PAYMENT RECORD
            // ==================================================

            /*
                IMPORTANT:

                Record is created ONLY when NOWPayments
                actually sends a webhook.

                Therefore:

                User opens payment page
                ↓
                closes payment page before payment starts
                ↓
                NO DB RECORD

                waiting / partially_paid / confirming
                ↓
                DB RECORD CREATED
            */


            payment =
                await subcribedModel.create({

                    userId,

                    planId: plan._id,

                    planName: plan.title,

                    title: plan.title,

                    duration: plan.duration,

                    originalPrice: plan.originalPrice,

                    discountedPrice: plan.discountedPrice,

                    amount: plan.discountedPrice,

                    features: plan.features,

                    currency: plan.currency || "AUD",

                    nowPaymentInvoiceId: invoice_id ?
                        String(invoice_id) : undefined,

                    invoiceUrl,

                    orderId: order_id,

                    paymentId: payment_id ?
                        String(payment_id) : undefined,

                    payAmount: pay_amount !== undefined ?
                        String(pay_amount) : undefined,

                    payCurrency: pay_currency || undefined,

                    status: payment_status,

                    isActive: payment_status === successfulStatus
                });


            // ----------------------------------------------
            // Final successful payment
            // ----------------------------------------------

            if (payment_status === successfulStatus) {

                const start = new Date();

                let days = 30;

                if (plan.duration) {

                    const match =
                        plan.duration.match(/\d+/);

                    if (match) {
                        days = Number(match[0]);
                    }
                }


                const expiry = new Date(
                    start.getTime() +
                    days * 24 * 60 * 60 * 1000
                );


                payment.subscriptionStart = start;
                payment.subscriptionExpiry = expiry;

                await payment.save();


                await EscortModel.findByIdAndUpdate(
                    userId, {
                        subscriptionActive: true,
                        subscriptionStatus: "active",
                        subscriptionplanexpiry: expiry,

                        $addToSet: {
                            subscribedplans: payment._id
                        }
                    }
                );
            }


            console.log(
                "Subscription payment created:",
                order_id,
                payment_status
            );


            return response.sendStatus(200);
        }


        // ==================================================
        // EXTRA PLAN
        // ==================================================

        if (isExtraPlanOrder) {

            /*
                Format:

                EXTRA_USERID_PLANID_TIMESTAMP
            */

            const orderParts = order_id.split("_");

            const userId = orderParts[1];
            const planId = orderParts[2];


            if (!userId || !planId) {

                console.log(
                    "Invalid extra plan order ID:",
                    order_id
                );

                return response.sendStatus(400);
            }


            // ----------------------------------------------
            // Find Escort
            // ----------------------------------------------

            const escort =
                await EscortModel.findById(userId);

            if (!escort) {

                console.log(
                    "Escort not found:",
                    userId
                );

                return response.sendStatus(404);
            }


            // ----------------------------------------------
            // Find Extra Plan
            // ----------------------------------------------

            const plan =
                await ExtraPlanModel.findById(planId);

            if (!plan) {

                console.log(
                    "Extra plan not found:",
                    planId
                );

                return response.sendStatus(404);
            }


            // ----------------------------------------------
            // Invoice URL
            // ----------------------------------------------

            const invoiceUrl = invoice_id ?
                `https://nowpayments.io/payment?iid=${invoice_id}` :
                null;


            // ----------------------------------------------
            // Find existing transaction
            // ----------------------------------------------

            let extraPayment =
                await ExtraPlanSubscriptionModel.findOne({
                    orderId: order_id
                });


            // ==================================================
            // EXISTING EXTRA PAYMENT
            // ==================================================

            if (extraPayment) {

                // ------------------------------------------
                // Duplicate webhook
                // ------------------------------------------

                if (
                    extraPayment.status === payment_status &&
                    extraPayment.paymentId === String(payment_id || "")
                ) {

                    console.log(
                        "Duplicate extra plan webhook:",
                        order_id,
                        payment_status
                    );

                    return response.sendStatus(200);
                }


                // ------------------------------------------
                // Update payment information
                // ------------------------------------------

                extraPayment.status =
                    payment_status;

                extraPayment.nowPaymentInvoiceId =
                    invoice_id ?
                    String(invoice_id) :
                    extraPayment.nowPaymentInvoiceId;

                extraPayment.invoiceUrl =
                    invoiceUrl ||
                    extraPayment.invoiceUrl;

                extraPayment.paymentId =
                    payment_id ?
                    String(payment_id) :
                    extraPayment.paymentId;

                extraPayment.payAmount =
                    pay_amount !== undefined ?
                    String(pay_amount) :
                    extraPayment.payAmount;

                extraPayment.payCurrency =
                    pay_currency ||
                    extraPayment.payCurrency;

                if (purchase_id) {
                    extraPayment.purchaseId =
                        String(purchase_id);
                }


                // ------------------------------------------
                // FINAL PAYMENT SUCCESS
                // ------------------------------------------

                if (
                    payment_status ===
                    successfulStatus
                ) {

                    await activateExtraPlan({
                        extraPayment,
                        plan,
                        escort
                    });
                }


                // ------------------------------------------
                // Failed
                // ------------------------------------------

                if (
                    failedStatuses.includes(
                        payment_status
                    )
                ) {

                    extraPayment.isActive = false;
                }


                await extraPayment.save();


                console.log(
                    "Extra plan payment updated:",
                    order_id,
                    payment_status
                );


                return response.sendStatus(200);
            }


            // ==================================================
            // CREATE EXTRA PLAN PAYMENT RECORD
            // ==================================================

            extraPayment =
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

                    nowPaymentInvoiceId: invoice_id ?
                        String(invoice_id) : undefined,

                    invoiceUrl,

                    orderId: order_id,

                    paymentId: payment_id ?
                        String(payment_id) : undefined,

                    payAmount: pay_amount !== undefined ?
                        String(pay_amount) : undefined,

                    payCurrency: pay_currency ||
                        undefined,

                    status: payment_status,

                    isActive: false
                });


            // ==================================================
            // FINAL SUCCESS
            // ==================================================

            if (
                payment_status ===
                successfulStatus
            ) {

                await activateExtraPlan({
                    extraPayment,
                    plan,
                    escort
                });

                await extraPayment.save();
            }


            console.log(
                "Extra plan payment created:",
                order_id,
                payment_status
            );


            return response.sendStatus(200);
        }


        return response.sendStatus(200);


    } catch (error) {

        console.log(
            "NOWPAYMENTS WEBHOOK ERROR:"
        );

        console.log(
            error?.response?.data ||
            error?.message
        );

        return response.sendStatus(500);
    }
};