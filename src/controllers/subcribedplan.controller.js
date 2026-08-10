import axios from "axios";
import subcribedModel from "../models/subcribedplanModel.js";
import EscortModel from "../models/escortModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";


const activePaymentStatuses = [
    "pending",
    "waiting",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid"
];


// create transaction 
export const createTransaction = async (request, response) => {
    try {

        const userId = request?.user?._id;
        const {
            planId
        } = request?.body;


        // ✅ Basic validation
        if (!userId) {
            return response.status(400).json({
                message: "Id is required",
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

        if (
            escort.subscriptionActive &&
            escort.subscriptionStatus === "active" &&
            escort.subscriptionplanexpiry &&
            new Date(escort.subscriptionplanexpiry) > new Date()
        ) {
            return response.status(400).json({
                message: "You already have an active subscription.",
                success: false,
                error: true
            });
        }


        // ✅ validation
        if (!planId) {
            return response.status(400).json({
                message: "PlanId is required",
                success: false,
                error: true
            });
        }

        // ✅ fetch from DB (IMPORTANT)
        const plan = await SubscriptionModel.findById(planId);


        if (!plan) {
            return response.status(404).json({
                message: "Plan not found",
                success: false,
                error: true
            });
        }


        if (
            plan.discountedPrice === null ||
            plan.discountedPrice === undefined ||
            Number(plan.discountedPrice) < 0
        ) {
            return response.status(400).json({
                message: "Invalid plan amount",
                success: false,
                error: true
            });
        }

        const existingPayment = await subcribedModel.findOne({
            userId,
            status: {
                $in: activePaymentStatuses
            }
        });

        if (existingPayment) {

            return response.status(200).json({
                success: true,
                error: false,
                type: "payment_in_progress",
                message: "You already have a payment in progress. Please complete your existing payment before subscribing to another plan.",
                transaction: existingPayment
            });
        }


        const orderId = `SUB_${userId}_${plan._id}_${Date.now()}`;


        //Free plan direct subscription activation

        if (Number(plan.discountedPrice) === 0) {

            let days = 30;

            if (plan.duration) {
                const match = plan.duration.match(/\d+/);

                if (match) {
                    days = parseInt(match[0]);
                }
            }

            const subscriptionStart = new Date();

            const subscriptionExpiry = new Date(
                subscriptionStart.getTime() +
                days * 24 * 60 * 60 * 1000
            );

            const freeSubscription = await subcribedModel.create({
                userId,
                planId: plan._id,
                planName: plan.title,
                title: plan.title,
                duration: plan.duration,
                originalPrice: plan.originalPrice,
                discountedPrice: 0,
                amount: 0,
                features: plan.features,
                currency: "AUD",
                orderId,
                isActive: true,
                status: "finished",
                subscriptionStart,
                subscriptionExpiry
            });

            await EscortModel.findByIdAndUpdate(userId, {
                subscriptionActive: true,
                subscriptionStatus: "active",
                subscriptionplanexpiry: subscriptionExpiry,
                $addToSet: {
                    subscribedplans: freeSubscription._id
                }
            });

            return response.status(200).json({
                message: `${plan.title} plan subscribed successfully`,
                success: true,
                error: false,
                type: "free",
                transaction: freeSubscription,
                paymentUrl: null
            });
        }


        // ✅ nowPayments payload
        const paymentData = {
            price_amount: Number(plan.discountedPrice),
            price_currency: "AUD",
            order_id: orderId,
            order_description: `Subscription - ${plan.title}`,
            ipn_callback_url: process.env.NOWPAYMENTS_IPN_URL,
            success_url: process.env.PAYMENT_SUCCESS_URL,
            cancel_url: process.env.PAYMENT_CANCEL_URL,
        };

        const nowPaymentRes = await axios.post(
            `${process.env.NOWPAYMENTS_API_URL}/invoice`,
            paymentData, {
                headers: {
                    "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 30000,
            }
        );

        console.log("NOWPAYMENTS FULL RESPONSE:", nowPaymentRes.data);


        const paymentUrl = nowPaymentRes.data.invoice_url;

        if (!paymentUrl) {
            return response.status(400).json({
                message: "Invoice URL not found in NOWPayments response",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Payment invoice created successfully. Please proceed to the payment page to complete your payment.",
            success: true,
            error: false,
            type: "paid",
            paymentUrl: paymentUrl,
        });


    } catch (error) {
        console.log("CATCH ERROR:", error?.response?.data?.message || error?.message);
        console.log("DETAILED ERROR:", JSON.stringify(error?.response?.data, null, 2));
        return response.status(500).json({
            message: "Failed to create transaction",
            success: false,
            error: true,
            details: error?.response?.data || error?.message
        });
    }
};




// NOWPayments Webhook
export const nowPaymentsWebhook = async (request, response) => {
    try {

        // const rawBody = request.body;

        // const signature = request.headers["x-nowpayments-sig"];
        // console.log("Signature =", signature);

        // const expectedSignature = crypto
        //     .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
        //     .update(rawBody)
        //     .digest("hex");

        // if (signature !== expectedSignature) {
        //     return response.sendStatus(401);
        // }

        // const event = JSON.parse(rawBody.toString());

        const event = request.body;

        console.log("NOWPAYMENTS WEBHOOK:", event);

        const {
            invoice_id,
            payment_id,
            payment_status,
            pay_amount,
            pay_currency,
            order_id
        } = event;


        // ============================================
        // 1. BASIC VALIDATION
        // ============================================

        if (!order_id || !payment_status) {
            console.log("Missing order_id or payment_status");

            return response.status(400).json({
                success: false,
                error: true,
                message: "order_id and payment_status are required"
            });
        }


        // ============================================
        // 2. GET USER ID + PLAN ID FROM ORDER ID
        // ============================================

        const orderParts = order_id.split("_");

        if (orderParts.length < 4 || orderParts[0] !== "SUB") {

            console.log("Invalid order_id:", order_id);

            return response.status(400).json({
                success: false,
                error: true,
                message: "Invalid order_id"
            });
        }


        const userId = orderParts[1];
        const planId = orderParts[2];


        console.log("Webhook User ID:", userId);
        console.log("Webhook Plan ID:", planId);
        console.log("Webhook Status:", payment_status);


        // ============================================
        // 3. VALIDATE USER
        // ============================================

        const escort = await EscortModel.findById(userId);

        if (!escort) {

            console.log("Escort not found:", userId);

            return response.status(404).json({
                success: false,
                error: true,
                message: "Escort not found"
            });
        }


        // ============================================
        // 4. GET PLAN FROM DATABASE
        // ============================================

        const plan = await SubscriptionModel.findById(planId);

        if (!plan) {

            console.log("Subscription plan not found:", planId);

            return response.status(404).json({
                success: false,
                error: true,
                message: "Subscription plan not found"
            });
        }


        // ============================================
        // 5. VALID PAYMENT STATUSES
        // ============================================

        const validStatuses = [
            "pending",
            "waiting",
            "confirming",
            "confirmed",
            "sending",
            "partially_paid",
            "finished",
            "failed",
            "expired",
            "refunded"
        ];


        if (!validStatuses.includes(payment_status)) {

            console.log(
                "Unknown NOWPayments status:",
                payment_status
            );

            return response.status(400).json({
                success: false,
                error: true,
                message: `Unsupported payment status: ${payment_status}`
            });
        }


        // ============================================
        // 6. FIND EXISTING TRANSACTION
        // ============================================

        let payment = await subcribedModel.findOne({
            orderId: order_id
        });


        // ============================================
        // 7. DUPLICATE WEBHOOK PROTECTION
        // ============================================

        if (
            payment &&
            payment.status === payment_status
        ) {

            console.log(
                "Duplicate webhook received:",
                order_id,
                payment_status
            );

            return response.sendStatus(200);
        }


        // ============================================
        // 8. CREATE TRANSACTION IF NOT EXISTS
        // ============================================

        if (!payment) {

            payment = new subcribedModel({
                userId: userId,
                planId: plan._id,
                planName: plan.title,
                title: plan.title,
                duration: plan.duration,

                originalPrice: plan.originalPrice,
                discountedPrice: plan.discountedPrice,
                amount: plan.discountedPrice,

                features: plan.features,

                currency: "AUD",

                nowPaymentInvoiceId: invoice_id,
                invoiceUrl: null,

                orderId: order_id,

                paymentId: payment_id,
                payAmount: pay_amount,
                payCurrency: pay_currency,

                status: payment_status,

                subscriptionStart: null,
                subscriptionExpiry: null,

                isActive: false
            });

            console.log(
                "New payment transaction created:",
                order_id
            );

        } else {

            // ========================================
            // 9. UPDATE EXISTING TRANSACTION
            // ========================================

            payment.status = payment_status;

            if (invoice_id) {
                payment.nowPaymentInvoiceId = invoice_id;
            }

            if (payment_id) {
                payment.paymentId = payment_id;
            }

            if (pay_amount !== undefined) {
                payment.payAmount = String(pay_amount);
            }

            if (pay_currency) {
                payment.payCurrency = pay_currency;
            }

            console.log(
                "Existing payment updated:",
                order_id
            );
        }


        // ============================================
        // 10. PAYMENT FINISHED
        // ============================================

        if (payment_status === "finished") {

            console.log(
                "PAYMENT FINISHED:",
                order_id
            );


            const subscriptionStart = new Date();

            let days = 30;

            if (plan.duration) {

                const match = plan.duration.match(/\d+/);

                if (match) {
                    days = parseInt(match[0], 10);
                }
            }


            const subscriptionExpiry = new Date(
                subscriptionStart.getTime() +
                days * 24 * 60 * 60 * 1000
            );


            payment.subscriptionStart = subscriptionStart;
            payment.subscriptionExpiry = subscriptionExpiry;
            payment.isActive = true;
            payment.status = "finished";


            // ========================================
            // ACTIVATE ESCORT SUBSCRIPTION
            // ========================================

            await EscortModel.findByIdAndUpdate(
                userId, {
                    subscriptionActive: true,
                    subscriptionStatus: "active",
                    subscriptionplanexpiry: subscriptionExpiry,

                    $addToSet: {
                        subscribedplans: payment._id
                    }
                }
            );

            console.log(
                "Subscription activated:",
                userId
            );
        }


        // ============================================
        // 11. PAYMENT STILL PROCESSING
        // ============================================

        if (
            payment_status === "pending" ||
            payment_status === "waiting" ||
            payment_status === "confirming" ||
            payment_status === "confirmed" ||
            payment_status === "sending" ||
            payment_status === "partially_paid"
        ) {

            payment.isActive = false;

            payment.subscriptionStart = null;
            payment.subscriptionExpiry = null;

            console.log(
                "Payment still processing:",
                payment_status
            );
        }


        // ============================================
        // 12. PAYMENT FAILED / EXPIRED / REFUNDED
        // ============================================

        if (
            payment_status === "failed" ||
            payment_status === "expired" ||
            payment_status === "refunded"
        ) {

            payment.isActive = false;

            payment.subscriptionStart = null;
            payment.subscriptionExpiry = null;

            console.log(
                "Payment unsuccessful:",
                payment_status
            );
        }


        // ============================================
        // 13. SAVE PAYMENT
        // ============================================

        await payment.save();


        // ============================================
        // 14. RESPONSE
        // ============================================

        return response.status(200).json({
            success: true,
            error: false,
            message: "NOWPayments webhook processed successfully"
        });


    } catch (error) {

        console.error(
            "NOWPAYMENTS WEBHOOK ERROR:",
            error?.response?.data || error?.message
        );

        return response.status(500).json({
            success: false,
            error: true,
            message: "Webhook processing failed"
        });
    }
};



// check active subscription
export const checkSubscription = async (request, response, next) => {
    try {
        const user = request.user?._id;

        if (!user) {
            return response.status(401).json({
                message: "Unauthorized",
                success: false,
                error: true
            });
        }

        const now = new Date();

        // ❗ expiry null or missing case
        if (!user.subscriptionplanexpiry) {
            return response.status(403).json({
                message: "Subscription required",
                success: false,
                error: true
            });
        }

        // ❗ expired case (auto update)
        if (new Date(user.subscriptionplanexpiry) < now) {


            await EscortModel.findByIdAndUpdate(user._id, {
                subscriptionActive: false,
                subscriptionStatus: "expired"
            });

            return response.status(403).json({
                message: "Subscription expired",
                success: false,
                error: true
            });
        }

        // ❗ inactive case
        if (!user.subscriptionActive || user.subscriptionStatus !== "active") {
            return response.status(403).json({
                message: "Subscription inactive",
                success: false,
                error: true
            });
        }

        next();

    } catch (error) {
        console.error("CHECK SUBSCRIPTION ERROR:", error.message);

        return response.status(500).json({
            message: "Internal server error",
            success: false,
            error: true
        });
    }
};