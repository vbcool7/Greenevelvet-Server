import crypto from "crypto";
import mongoose from "mongoose";
import ExtraPlanModel from "../models/extraplanModel.js";
import EscortModel from "../models/escortModel.js";
import subcribedModel from "../models/subcribedplanModel.js";
import axios from "axios";
import SubscriptionModel from "../models/subscriptionModel.js";



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
        const existing = await ExtraPlanModel.findOne({ slug });
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
        const { id } = request.params;

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
                _id: { $ne: id }
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
            ...(iconName && { iconName }),
            ...(title && { title }),
            ...(slug && { slug }),
            ...(duration && { duration }),
            ...(price !== undefined && { price }),
            ...(discription !== undefined && { discription }),
            ...(currency && { currency }),
            ...(totalSlots !== undefined && { totalSlots }),
            ...(isActive !== undefined && { isActive })
        };

        const updatedPlan = await ExtraPlanModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
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
        const plans = await ExtraPlanModel.find({ isActive: true })
            .sort({ createdAt: 1 })
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
            .sort({ createdAt: 1 });

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
        const { id } = request.params;

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
        const plan = await ExtraPlanModel.findById(planId);

        if (!plan) {
            return response.status(404).json({
                message: "Plan not found",
                success: false,
                error: true
            });
        }


        if (!plan.price || Number(plan.price) <= 0) {
            return response.status(400).json({
                message: "Invalid plan amount",
                success: false,
                error: true
            });
        }


        // const existingPending = await subcribedModel.findOne({
        //     userId,
        //     planId,
        //     status: "pending"
        // });

        // if (existingPending) {
        //     return response.status(200).json({
        //         success: true,
        //         error: false,
        //         message: "Pending payment already exists",
        //         paymentUrl: existingPending.invoiceUrl,
        //         transaction: existingPending
        //     });
        // }


        console.log("NOWPAYMENTS_API_URL =", process.env.NOWPAYMENTS_API_URL);
        console.log("FINAL URL =", `${process.env.NOWPAYMENTS_API_URL}/invoice`);


        const orderId = `SUB_${userId}_${plan._id}_${Date.now()}`;


        // ✅ nowPayments payload
        const paymentData = {
            price_amount: Number(plan.price),
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
            originalPrice: plan.price,
            discountedPrice: plan.price,
            amount: plan.price,
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



// NOWPayments Webhook
export const nowPaymentsWebhook = async (request, response) => {
    try {


        const rawBody = request.body;

        const signature = request.headers["x-nowpayments-sig"];
        console.log("Signature =", signature);

        const expectedSignature = crypto
            .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
            .update(rawBody)
            .digest("hex");

        if (signature !== expectedSignature) {
            return response.sendStatus(401);
        }

        const event = JSON.parse(rawBody.toString());


        console.log("webhook req body event : ", event);



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