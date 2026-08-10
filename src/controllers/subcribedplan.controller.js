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



        const existingPayment = await subcribedModel.findOne({
            userId,
            planId,
            status: {
                $in: activePaymentStatuses
            }
        });

        if (existingPayment) {

            if (!existingPayment.invoiceUrl) {
                return response.status(400).json({
                    success: false,
                    error: true,
                    message: "Existing payment link is not available. Please try again."
                });
            }
            return response.status(200).json({
                success: true,
                error: false,
                type: "paid",
                message: "You already have a payment in progress. Continue with your existing payment.",
                paymentUrl: existingPayment.invoiceUrl,
                transaction: existingPayment
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
            $addToSet: {
                subscribedplans: newSub._id
            }
        });


        return response.status(200).json({
            message: "Your subscription has been created successfully. Please proceed to the payment page to complete your payment.",
            success: true,
            error: false,
            type: "paid",
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

        const invoiceId = event.invoice_id;
        const paymentStatus = event.payment_status;

        if (!invoiceId || !paymentStatus) {
            return response.sendStatus(400);
        }

        // Find Transaction 
        const payment = await subcribedModel.findOne({
            nowPaymentInvoiceId: invoiceId
        });

        if (!payment) {
            console.log("Payment not found");
            return response.sendStatus(404);
        }

        // Duplicate webhook protection
        if (payment.status === paymentStatus) {
            return response.sendStatus(200);
        }

        // Save latest payment details
        payment.status = paymentStatus;
        payment.payCurrency = event.pay_currency;
        payment.payAmount = event.pay_amount;
        payment.paymentId = event.payment_id;
        payment.purchaseId = event.purchase_id;

        let updateEscortData = {};

        // Payment Success
        if (paymentStatus === "finished") {

            const start = new Date();

            let days = 30;

            if (payment.duration) {
                const match = payment.duration.match(/\d+/);

                if (match) {
                    days = Number(match[0]);
                }
            }

            const expiry = new Date(
                start.getTime() + (days * 24 * 60 * 60 * 1000)
            );

            payment.subscriptionStart = start;
            payment.subscriptionExpiry = expiry;

            updateEscortData = {
                subscriptionActive: true,
                subscriptionStatus: "active",
                subscriptionplanexpiry: expiry,
                $addToSet: {
                    subscribedplans: payment._id
                }
            };
        }

        // Failed Payment
        if (
            paymentStatus === "failed" ||
            paymentStatus === "expired"
        ) {

            payment.status = paymentStatus;
        }

        // Waiting / Confirming
        if (
            paymentStatus === "waiting" ||
            paymentStatus === "confirming" ||
            paymentStatus === "confirmed" ||
            paymentStatus === "sending"
        ) {

            payment.status = paymentStatus;
        }

        await payment.save();

        if (Object.keys(updateEscortData).length > 0) {

            await EscortModel.findByIdAndUpdate(
                payment.userId,
                updateEscortData
            );

        }

        return response.sendStatus(200);

    } catch (error) {

        console.log("NOWPAYMENTS WEBHOOK ERROR");

        console.log(error.response?.data || error.message);

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