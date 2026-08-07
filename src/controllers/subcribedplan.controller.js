import axios from "axios";
import subcribedModel from "../models/subcribedplanModel.js";
import EscortModel from "../models/escortModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";


// create transaction 
export const createTransaction = async (request, response) => {
    try {
        console.log("Create transaction api call");

        const userId = request?.user?._id;
        const { planId } = request?.body;

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


        if (!plan.discountedPrice || Number(plan.discountedPrice) <= 0) {
            return response.status(400).json({
                message: "Invalid plan amount",
                success: false,
                error: true
            });
        }


        const existingPending = await subcribedModel.findOne({
            userId,
            planId,
            status: "pending"
        });

        if (existingPending) {
            return response.status(200).json({
                success: true,
                error: false,
                message: "Pending payment already exists",
                paymentUrl: existingPending.invoiceUrl,
                transaction: existingPending
            });
        }


        const orderId = `SUB_${userId}_${plan._id}_${Date.now()}`;


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
            paymentData,
            {
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


        // ✅  create record in DB
        const newSub = await subcribedModel.create({
            userId,
            planId: plan._id,
            planName: plan.title,
            title: plan.title,
            duration: plan.duration,
            originalPrice: plan.originalPrice,
            discountedPrice: plan.discountedPrice,
            amount: plan.discountedPrice,
            features: plan.features,
            currency: "AUD",
            nowPaymentInvoiceId: nowPaymentRes.data.id,
            invoiceUrl: nowPaymentRes.data.invoice_url,
            orderId: orderId,
            status: "pending"
        });

        // ✅ (optional) Escort model me pending attach kar sakte ho
        await EscortModel.findByIdAndUpdate(userId, {
            $push: { subscribedplans: newSub._id }
        });


        return response.status(200).json({
            message: "For Plan Subscription Transaction created successfully and Now Go through payment page",
            success: true,
            error: false,
            nowPaymentsInvoiceId: nowPaymentRes.data.id,
            transaction: newSub,
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

// web hook response and update 
export const escrowWebhook = async (request, response) => {
    try {
    

        const event = request.body;

        const invoiceId = event.invoice_id;
        const paymentStatus = event.payment_status;

        if (!txnId || !status) {
            return response.sendStatus(400);
        }

        const payment = await subcribedModel.findOne({
            escrowTransactionId: txnId
        });

        if (!payment) return response.sendStatus(404);

        // 🔁 Idempotency (duplicate webhook protection)
        if (payment.status === status) {
            return response.sendStatus(200);
        }

        let updateEscortData = {};

        // 💰 FUNDS SECURED → ACTIVATE SUBSCRIPTION
        if (status === "funds_secured") {

            const start = new Date();

            // ✅ duration dynamic (example: "30 days")
            let days = 30;
            if (payment.duration) {
                const match = payment.duration.match(/\d+/);
                if (match) days = parseInt(match[0]);
            }

            const expiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

            payment.status = "funds_secured";
            payment.subscriptionStart = start;
            payment.subscriptionExpiry = expiry;

            updateEscortData = {
                subscriptionActive: true,
                subscriptionStatus: "active",
                subscriptionplanexpiry: expiry,
                $addToSet: { subscribedplans: payment._id }
            };
        }

        // ❌ FAILED
        if (status === "failed") {
            payment.status = "failed";
        }

        // ✅ COMPLETED (funds released)
        if (status === "completed") {
            payment.status = "completed";
        }

        // 🔄 SAVE PAYMENT
        await payment.save();

        // 🔄 UPDATE ESCORT ONLY IF NEEDED
        if (Object.keys(updateEscortData).length > 0) {
            await EscortModel.findByIdAndUpdate(
                payment.userId,
                updateEscortData
            );
        }

        return response.sendStatus(200);

    } catch (error) {
        console.error("ESCROW WEBHOOK ERROR:", error?.response?.data || error.message);
        return response.sendStatus(500);
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