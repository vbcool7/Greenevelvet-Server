import mongoose from "mongoose";
import requestIp from "request-ip";
import VisitsModel from "../models/visitsModel.js";

// Add visit
export const addVisit = async (request, response) => {
    try {
        const { escortId, type, city, country, visitorId } = request.body;

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



// ✅ ISO WEEK FUNCTION
function getISOWeekNumber(date) {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);

    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);

    const week1 = new Date(tempDate.getFullYear(), 0, 4);

    return 1 + Math.round(
        ((tempDate - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
    );
}

// fetch visits
export const getVisitStats = async (request, response) => {
    try {
        const { type = "week", _id } = request.query;

        console.log("request query", request.query);

        const now = new Date();
        let startDate;

        // ✅ DATE RANGE
        if (type === "day") {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        }
        else if (type === "week") {
            startDate = new Date();
            startDate.setDate(now.getDate() - 27); // ✅ last 4 weeks
            startDate.setHours(0, 0, 0, 0);
        }
        else {
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }

        // ✅ GROUPING
        let groupId;

        if (type === "day") {
            groupId = { $dayOfWeek: "$date" };
        }
        else if (type === "week") {
            groupId = { $isoWeek: "$date" };   // ✅ correct
        }
        else if (type === "month") {
            groupId = { $month: "$date" };
        }

        const data = await VisitsModel.aggregate([
            {
                $match: {
                    escortId: new mongoose.Types.ObjectId(_id),
                    date: { $gte: startDate, $lte: now },
                },
            },
            {
                $facet: {
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

                    totalVisitors: [
                        { $match: { type: "profile_view" } },
                        { $count: "count" },
                    ],

                    uniqueVisitors: [
                        {
                            $match: {
                                type: "profile_view",
                                visitorId: { $ne: null },
                            },
                        },
                        { $group: { _id: "$visitorId" } },
                        { $count: "count" },
                    ],

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

        // ✅ STEP 1: FORMAT LABELS
        const formattedChart = result.chartData.map((item) => {
            let name = item._id;

            if (type === "day") {
                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                name = days[item._id - 1];
            }

            if (type === "week") {
                name = `Week ${item._id}`;
            }

            if (type === "month") {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                name = months[item._id - 1];
            }

            return {
                name,
                visits: item.visits,
            };
        });

        // ✅ STEP 2: FINAL CHART
        let finalChart = [];

        if (type === "day") {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            finalChart = days.map(day => {
                const found = formattedChart.find(item => item.name === day);
                return { name: day, visits: found ? found.visits : 0 };
            });
        }

        else if (type === "week") {
            const currentWeek = getISOWeekNumber(now);

            const weeks = [
                currentWeek - 3,
                currentWeek - 2,
                currentWeek - 1,
                currentWeek
            ];

            finalChart = weeks.map(weekNum => {
                const label = `Week ${weekNum}`;
                const found = formattedChart.find(item => item.name === label);

                return {
                    name: label,
                    visits: found ? found.visits : 0
                };
            });
        }

        else if (type === "month") {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            finalChart = months.map(month => {
                const found = formattedChart.find(item => item.name === month);
                return { name: month, visits: found ? found.visits : 0 };
            });
        }

        // ✅ RESPONSE
        response.json({
            success: true,
            data: {
                chartData: finalChart,
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

//  last 30 days total of all stats 
export const totalVisitStats = async (request, response) => {
    try {
        const { _id } = request.query;

        if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
            return response.status(400).json({
                success: false,
                message: "Invalid or missing escortId",
            });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const data = await VisitsModel.aggregate([
            {
                $match: {
                    escortId: new mongoose.Types.ObjectId(_id),
                    date: { $gte: thirtyDaysAgo, $lte: now },
                },
            },
            {
                $facet: {
                    totalVisitors: [
                        { $match: { type: "profile_view" } },
                        { $count: "count" },
                    ],
                    uniqueVisitors: [
                        { $match: { type: "profile_view", visitorId: { $ne: null } } },
                        { $group: { _id: "$visitorId" } },
                        { $count: "count" },
                    ],
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

        response.json({
            success: true,
            data: {
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
        console.error("totalVisitStats error:", error);
        response.status(500).json({
            success: false,
            message: "Error fetching total visit stats",
        });
    }
};