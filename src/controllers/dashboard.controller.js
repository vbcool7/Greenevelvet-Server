import BookingModel from "../models/bookingModel.js";
import ClientModel from "../models/clientModel.js";
import EscortModel from "../models/escortModel.js";
import subcribedModel from "../models/subcribedplanModel.js";
import ExtraPlanSubscriptionModel from "../models/extraPlanSubscriptionModel.js";

// get all escorts data
export async function getEscortsdata(request, response) {

    try {

        const escorts = await EscortModel.find({
                isVerified: true,
            })
            .select("-password");

        return response.status(200).json({
            success: true,
            error: false,
            message: `fetch Escort data successfully`,
            data: escorts || [],
        });

    } catch (error) {
        console.log("get escorts data error ", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || error
        });

    }

}

// get all escorts data
export async function getClientsdata(request, response) {

    try {
        console.log("api call");

        const clients = await ClientModel.find()
            .select("-password")

        return response.status(200).json({
            success: true,
            error: false,
            message: `fetch Client data successfully`,
            data: clients || [],
        });

    } catch (error) {
        console.log("get clients data error ", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || error
        });

    }

}

// bookings and availability
export const getBookingsData = async (request, response) => {

    try {

        const bookings = await BookingModel.find()
            .populate({
                path: "userId",
                match: {
                    isVerified: true
                },
                select: `
                name
                country
                city
                isVerified
                avatar
                totalAmountPaid
            `
            });

        // REMOVE NULL ESCORTS
        const filteredBookings = bookings.filter(
            (item) => item.userId !== null
        );

        return response.status(200).json({
            message: "Bookings fetched successfully",
            success: true,
            error: false,
            data: filteredBookings
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};


export const getAllEarnings = async (request, response) => {
    try {
        const {
            country = "",
                city = "",
                service = "",
                paymentType = "",
                startDate = "",
                endDate = "",
                page = 1,
                limit = 10
        } = request.query;

        const currentPage = Math.max(Number(page), 1);
        const pageLimit = Math.max(Number(limit), 1);
        const skip = (currentPage - 1) * pageLimit;

        // ============================================
        // 1. FIND ESCORTS FOR COUNTRY / CITY FILTER
        // ============================================

        const escortFilter = {};

        if (country) {
            escortFilter.country = {
                $regex: country,
                $options: "i"
            };
        }

        if (city) {
            escortFilter.city = {
                $regex: city,
                $options: "i"
            };
        }

        const escorts = await EscortModel.find(escortFilter)
            .select("_id escortId avatar name country city")
            .lean();

        const escortIds = escorts.map((escort) => escort._id);

        // ============================================
        // 2. COMMON DATE FILTER
        // ============================================

        const dateFilter = {};

        if (startDate || endDate) {
            dateFilter.createdAt = {};

            if (startDate) {
                dateFilter.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
            }

            if (endDate) {
                dateFilter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
            }
        }

        // ============================================
        // 3. SUBSCRIPTION PAYMENTS
        // ============================================

        let subscriptionPayments = [];

        if (
            !paymentType ||
            paymentType === "subscription" ||
            paymentType === "all"
        ) {
            const subscriptionFilter = {
                status: "finished",
                userId: {
                    $in: escortIds
                },
                ...dateFilter
            };

            if (service) {
                subscriptionFilter.planName = {
                    $regex: service,
                    $options: "i"
                };
            }

            subscriptionPayments = await subcribedModel.find(subscriptionFilter)
                .populate({
                    path: "userId",
                    select: "escortId name avatar country city"
                })
                .lean();
        }

        // ============================================
        // 4. EXTRA PLAN PAYMENTS
        // ============================================

        let extraPlanPayments = [];

        if (
            !paymentType ||
            paymentType === "extra" ||
            paymentType === "extra-plan" ||
            paymentType === "all"
        ) {
            const extraPlanFilter = {
                status: "finished",
                userId: {
                    $in: escortIds
                },
                ...dateFilter
            };

            if (service) {
                extraPlanFilter.planName = {
                    $regex: service,
                    $options: "i"
                };
            }

            extraPlanPayments =
                await ExtraPlanSubscriptionModel.find(extraPlanFilter)
                .populate({
                    path: "userId",
                    select: "escortId name avatar country city"
                })
                .lean();
        }

        // ============================================
        // 5. FORMAT BOTH PAYMENT TYPES
        // ============================================

        const subscriptionData = subscriptionPayments.map((payment) => ({
            _id: payment._id,
            date: payment.createdAt,
            escortId: payment.userId?.escortId || "",
            escortName: payment.userId?.name || "",
            country: payment.userId?.country || "",
            city: payment.userId?.city || "",
            service: payment.planName || payment.title || "",
            paymentType: "Subscription",
            amount: Number(payment.amount || 0),
            currency: payment.currency || "AUD",
            status: payment.status
        }));

        const extraPlanData = extraPlanPayments.map((payment) => ({
            _id: payment._id,
            date: payment.createdAt,
            escortId: payment.userId?.escortId || "",
            escortName: payment.userId?.name || "",
            country: payment.userId?.country || "",
            city: payment.userId?.city || "",
            service: payment.planName || "",
            paymentType: "Extra Plan",
            amount: Number(payment.price || 0),
            currency: payment.currency || "AUD",
            status: payment.status
        }));

        // ============================================
        // 6. COMBINE PAYMENTS
        // ============================================

        let allPayments = [
            ...subscriptionData,
            ...extraPlanData
        ];

        // Latest payments first
        allPayments.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        // ============================================
        // 7. SUMMARY
        // ============================================

        const totalEarnings = allPayments.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
        );

        const subscriptionEarnings = subscriptionData.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
        );

        const extraPlanEarnings = extraPlanData.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
        );

        const successfulPayments = allPayments.length;

        // ============================================
        // 8. COUNTRY BREAKDOWN
        // ============================================

        const countryMap = {};

        allPayments.forEach((payment) => {
            const key = payment.country || "Unknown";

            if (!countryMap[key]) {
                countryMap[key] = {
                    country: key,
                    totalEarnings: 0,
                    payments: 0
                };
            }

            countryMap[key].totalEarnings += Number(payment.amount || 0);
            countryMap[key].payments += 1;
        });

        const countryBreakdown = Object.values(countryMap).sort(
            (a, b) => b.totalEarnings - a.totalEarnings
        );

        // ============================================
        // 9. CITY BREAKDOWN
        // ============================================

        const cityMap = {};

        allPayments.forEach((payment) => {
            const key = payment.city || "Unknown";

            if (!cityMap[key]) {
                cityMap[key] = {
                    city: key,
                    totalEarnings: 0,
                    payments: 0
                };
            }

            cityMap[key].totalEarnings += Number(payment.amount || 0);
            cityMap[key].payments += 1;
        });

        const cityBreakdown = Object.values(cityMap).sort(
            (a, b) => b.totalEarnings - a.totalEarnings
        );

        // ============================================
        // 10. SERVICE BREAKDOWN
        // ============================================

        const serviceMap = {};

        allPayments.forEach((payment) => {
            const key = payment.service || "Unknown";

            if (!serviceMap[key]) {
                serviceMap[key] = {
                    service: key,
                    totalEarnings: 0,
                    payments: 0
                };
            }

            serviceMap[key].totalEarnings += Number(payment.amount || 0);
            serviceMap[key].payments += 1;
        });

        const serviceBreakdown = Object.values(serviceMap).sort(
            (a, b) => b.totalEarnings - a.totalEarnings
        );

        // ============================================
        // 11. PAGINATION
        // ============================================

        const totalRecords = allPayments.length;

        const paginatedPayments = allPayments.slice(
            skip,
            skip + pageLimit
        );

        // ============================================
        // 12. RESPONSE
        // ============================================

        return response.status(200).json({
            success: true,
            error: false,
            data: paginatedPayments,
            summary: {
                totalEarnings,
                subscriptionEarnings,
                extraPlanEarnings,
                successfulPayments
            },
            breakdown: {
                country: countryBreakdown,
                city: cityBreakdown,
                service: serviceBreakdown
            },
            pagination: {
                page: currentPage,
                limit: pageLimit,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageLimit)
            }
        });

    } catch (error) {
        console.error("ADMIN EARNINGS ERROR:", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: "Failed to fetch earnings"
        });
    }
};


export const getRecentSubscriptions = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 5, 20);

        const subscriptions = await subcribedModel
            .find({
                status: "finished"
            })
            .sort({
                createdAt: -1
            })
            .limit(limit)
            .populate({
                path: "userId",
                select: "escortId avatar name email"
            })
            .select(
                "userId planName amount currency subscriptionStart subscriptionExpiry status createdAt"
            )
            .lean();

        const data = subscriptions.map((subscription) => ({
            subscriptionId: subscription._id,
            escortId: subscription.userId?.escortId || "",
            escortName: subscription.userId?.name || "",
            planName: subscription.planName,
            amount: subscription.amount,
            currency: subscription.currency,
            subscriptionStart: subscription.subscriptionStart,
            subscriptionExpiry: subscription.subscriptionExpiry,
            status: subscription.status,
            createdAt: subscription.createdAt
        }));

        return res.status(200).json({
            success: true,
            message: "Recent subscriptions fetched successfully",
            data
        });

    } catch (error) {
        console.error("Get Recent Subscriptions Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent subscriptions",
            error: error.message
        });
    }
};