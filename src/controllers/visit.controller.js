import mongoose from "mongoose";
import requestIp from "request-ip";
import VisitsModel from "../models/visitsModel.js";

// Add visit
export const addVisit = async (request, response) => {
    try {
        const { escortId, type, city, country } = request.body;

        // ✅ logged-in user (secure)
        const visitorId = request.user ? request.user.id : null;

        // ✅ IP detection (library)
        const ip = requestIp.getClientIp(request);

        // ✅ escortId validation
        if (!mongoose.Types.ObjectId.isValid(escortId)) {
            return response.status(400).json({
                message: "Invalid escortId",
                success: false,
                error: true,
            });
        }

        // ✅ 5 min duplicate control
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

        const existing = await VisitsModel.findOne({
            escortId,
            type,
            $or: [
                { visitorId },
                { ip },
            ],
            date: { $gte: fiveMinAgo },
        });

        if (existing) {
            return response.status(200).json({
                message: "Already counted recently",
                success: false,
                error: true,
            });
        }

        // ✅ save visit
        const visit = await VisitsModel.create({
            escortId,
            visitorId,
            type: type || "profile_view",
            city,
            country,
            ip,
        });

        response.status(201).json({
            message: "Visit added",
            success: true,
            error: false,
            data: visit,
        });

    } catch (error) {
        console.log("visit error ", error);

        return response.status(500).json({
            message: error.message || "Error adding visit",
            success: false,
            error: true,
        });
    }
};

// fetch visits
export const getVisitStats = async (request , response) => {
    try {
        const { type = "week" } = request.query;
        const escortId = request.user._id;

        const now = new Date();
        let startDate;

        // ✅ date range
        if (type === "day") {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (type === "week") {
            startDate = new Date();
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }

        // ✅ grouping
        let groupId;
        if (type === "day") groupId = { $hour: "$date" };
        else if (type === "week") groupId = { $dayOfWeek: "$date" };
        else groupId = { $week: "$date" };

        const data = await VisitsModel.aggregate([
            {
                $match: {
                    escortId: new mongoose.Types.ObjectId(escortId),
                    date: { $gte: startDate, $lte: now },
                },
            },

            {
                $facet: {
                    // 🔥 CHART → ONLY profile_view
                    chartData: [
                        { $match: { type: "profile_view" } },
                        {
                            $group: {
                                _id: groupId,
                                visits: { $sum: 1 },
                            },
                        },
                        { $sort: { _id: 1 } },
                    ],

                    // 🔥 TOTAL VISITS
                    totalVisitors: [
                        { $match: { type: "profile_view" } },
                        { $count: "count" },
                    ],

                    // 🔥 UNIQUE VISITORS (ONLY logged users)
                    uniqueVisitors: [
                        {
                            $match: {
                                type: "profile_view",
                                visitorId: { $ne: null },
                            },
                        },
                        {
                            $group: {
                                _id: "$visitorId",
                            },
                        },
                        { $count: "count" },
                    ],

                    // 🔥 OTHER COUNTS
                    callClicks: [
                        { $match: { type: "call_click" } },
                        { $count: "count" },
                    ],

                    whatsappClicks: [
                        { $match: { type: "whatsapp_click" } },
                        { $count: "count" },
                    ],

                    smsClicks: [
                        { $match: { type: "sms_click" } },
                        { $count: "count" },
                    ],

                    websiteClicks: [
                        { $match: { type: "website_click" } },
                        { $count: "count" },
                    ],

                    newsandtourClicks: [
                        { $match: { type: "newsandtour_click" } },
                        { $count: "count" },
                    ],

                    blogClicks: [
                        { $match: { type: "blog_click" } },
                        { $count: "count" },
                    ],
                },
            },
        ]);

        const result = data[0];

        // 🔥 label formatting
        const formattedChart = result.chartData.map((item) => {
            let name = item._id;

            if (type === "week") {
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                name = days[item._id - 1];
            }

            if (type === "day") {
                name = `${item._id}:00`;
            }

            if (type === "month") {
                name = `Week ${item._id}`;
            }

            return {
                name,
                visits: item.visits,
            };
        });

        response.json({
            success: true,
            data: {
                chartData: formattedChart,
                totalVisitors: result.totalVisitors[0]?.count || 0,
                uniqueVisitors: result.uniqueVisitors[0]?.count || 0,
                callClicks: result.callClicks[0]?.count || 0,
                whatsappClicks: result.whatsappClicks[0]?.count || 0,
                smsClicks: result.smsClicks[0]?.count || 0,
                websiteClicks: result.websiteClicks[0]?.count || 0,
                newsandtourClicks: result.newsandtourClicks[0]?.count || 0,
                blogClicks: result.blogClicks[0]?.count || 0,
            },
        });

    } catch (error) {
        console.log("fetch error ", error);

        response.status(500).json({
            success: false,
            message: "Error fetching stats",
        });
    }
};