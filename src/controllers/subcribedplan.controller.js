import axios from "axios";
import subcribedModel from "../models/subcribedplanModel.js";
import EscortModel from "../models/escortModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";


// create transaction 
export const createTransaction = async (request, response) => {
    try {

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

        console.log("escort", escort);

        console.log("process.env.ESCROW_EMAIL", process.env.ESCROW_EMAIL);

        let email = escort?.email;

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


        // ✅ Escrow payload
        const txnData = {
            description: `Subscription - ${plan.title}`,
            currency: "aud",
            action: "create",
            return_url: "https://greenevelvets.com/payment-success",
            parties: [
                {
                    role: "buyer",
                    customer: escort.email,
                },
                {
                    role: "seller",
                    customer: process.env.ESCROW_EMAIL,
                }
            ],
            items: [
                {
                    title: plan.title,
                    description: plan.duration,
                    type: "milestone",
                    inspection_period: 86400, // fast release
                    quantity: 1,
                    schedule: [
                        {
                            amount: Number(plan.discountedPrice).toFixed(2),
                            payer_customer: "buyer",
                            beneficiary_customer: "seller"
                        }
                    ]
                }
            ]
        };

        const escrowRes = await axios.post(
            "https://api.escrow.com/2017-09-01/transaction",
            txnData,
            {
                auth: {
                    username: process.env.ESCROW_EMAIL,
                    password: process.env.ESCROW_API_KEY
                }
            }
        );

        // ✅  create record in DB
        const newSub = await subcribedModel.create({
            userId,
            planId: plan.planId,
            title: plan.title,
            duration: plan.duration,
            originalPrice: plan.originalPrice,
            discountedPrice: plan.discountedPrice,
            amount: plan.discountedPrice,
            currency: "AUD",
            escrowTransactionId: escrowRes.data.id,
            status: "pending"
        });

        // ✅ (optional) Escort model me pending attach kar sakte ho
        await EscortModel.findByIdAndUpdate(userId, {
            $push: { subscribedplans: newSub._id }
        });

        return response.status(200).json({
            message: "Transaction created successfully",
            success: true,
            error: false,
            escrowTransactionId: escrowRes.data.id,
            transaction: newSub
        });

    } catch (error) {
        console.log("CATCH ERROR:", error?.response?.data?.message || error.message);
        console.log("DETAILED ERROR:", JSON.stringify(error?.response?.data, null, 2));
        return response.status(500).json({
            message: "Failed to create transaction",
            success: false,
            error: true,
            details: error?.response?.data || error.message
        });
    }
};

// web hook response and update 
export const escrowWebhook = async (request, response) => {
    try {
        const event = request.body;

        const txnId = event.id;
        const status = event.status;

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