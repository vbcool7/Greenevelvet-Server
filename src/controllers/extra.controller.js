import mongoose from "mongoose";
import ExtraPlanModel from "../models/extraplanModel.js";
import EscortModel from "../models/escortModel.js";
import subcribedModel from "../models/subcribedplanModel.js";
import axios from "axios";



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
        const plan = await ExtraPlanModel.findById(planId);

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
                            amount: Number(plan.price).toFixed(2),
                            payer_customer: escort.email,
                            beneficiary_customer: process.env.ESCROW_EMAIL,
                        }
                    ]
                }
            ]
        };

        const escrowRes = await axios.post(
            process.env.ESCROW_API_URL,
            txnData,
            {
                auth: {
                    username: process.env.ESCROW_EMAIL,
                    password: process.env.ESCROW_API_KEY
                }
            }
        );

        console.log("ESCROW FULL RESPONSE:", escrowRes.data);

        // ✅  create record in DB
        const newSub = await subcribedModel.create({
            userId,
            planId: plan._id,
            planName: plan.title,
            title: plan.title,
            duration: plan.duration,
            amount: plan.price,
            currency: "AUD",
            escrowTransactionId: escrowRes.data.id,
            status: "pending"
        });

        // ✅ (optional) Escort model me pending attach kar sakte ho
        await EscortModel.findByIdAndUpdate(userId, {
            $push: { subscribedplans: newSub._id }
        });

        const buyerParty = escrowRes.data.parties.find(p => p.role === 'buyer');
        const paymentUrl = buyerParty ? buyerParty.next_step : null;

        if (!paymentUrl) {
            return response.status(400).json({
                message: "Payment link (next_step) not found in Escrow response",
                success: false,
                error: true
            });
        }
        return response.status(200).json({
            message: "Transaction created successfully",
            success: true,
            error: false,
            escrowTransactionId: escrowRes.data.id,
            transaction: newSub,
            paymentUrl: paymentUrl,
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