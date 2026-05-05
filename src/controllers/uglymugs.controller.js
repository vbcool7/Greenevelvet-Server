import UglyMugsModel from "../models/uglymugsModel.js";


// create report
export const createUglyMug = async (request, response) => {
    try {
        const userId = request.user?._id;

        const { clientPhone, clientEmail, reason, incidentType, location } = request.body;

        if (!userId) {
            return response.status(400).json({
                message: "Unauthorized action",
                success: false,
                error: true
            });
        }

        if (!clientPhone || !reason || !location || !incidentType) {
            return response.status(400).json({
                message: "clientPhone, reason, location and incidentType are required.",
                success: false,
                error: true
            });
        }

        if (!/^[0-9]{10,15}$/.test(clientPhone)) {
            return response.status(400).json({
                message: "Invalid phone number",
                success: false,
                error: true
            });
        }

        if (clientEmail && !/^\S+@\S+\.\S+$/.test(clientEmail)) {
            return response.status(400).json({
                message: "Invalid email",
                success: false,
                error: true
            });
        }

        const existing = await UglyMugsModel.findOne({
            reportedBy: userId,
            clientPhone
        });

        if (existing) {
            return response.status(400).json({
                message: "You already reported this client",
                success: false,
                error: true
            });
        }

        const newEntry = await UglyMugsModel.create({
            reportedBy: userId,
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            reason: reason.trim(),
            incidentType,
            location: location.trim(),
        });

        return response.status(201).json({
            success: true,
            message: "Entry reported successfully",
            data: newEntry,
            error: false
        });

    } catch (error) {
        console.log("Catch error", error);

        response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};

//fetch all report
export const getAllUglyMugsAdmin = async (request, response) => {
    try {
        const data = await UglyMugsModel.find({})
            .populate("reportedBy", "name email escortId")
            .sort({ createdAt: -1 })
            .limit(50);

        return response.status(200).json({
            success: true,
            message: "All reports fetched successfully",
            count: data.length,
            data,
            error: false
        });

    } catch (error) {
        console.log("Fetch error", error);

        return response.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
    }
};

// fetch escort report
export const getMyUglyMugs = async (request, response) => {
    try {
        const userId = request.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized",
                success: false,
                error: true
            });
        }

        const data = await UglyMugsModel.find({ reportedBy: userId })
            .sort({ createdAt: -1 });

        return response.status(200).json({
            success: true,
            message: "Your reports fetched successfully",
            data,
            error: false
        });

    } catch (error) {
        console.log("Fetch error", error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// fetch client status report
export const checkClientRisk = async (request, response) => {
    try {
        const { clientPhone, clientEmail } = request.body;

        if (!clientPhone && !clientEmail) {
            return response.status(400).json({
                success: false,
                message: "Phone or Email is required",
                error: true
            });
        }

        // Build query
        let query = [];

        if (clientPhone) {
            query.push({ clientPhone });
        }

        if (clientEmail) {
            query.push({ clientEmail });
        }

        const reports = await UglyMugsModel.find({
            $or: query
        }).select("reason incidentType location createdAt");

        const reportCount = reports.length;

        // Risk logic
        let riskLevel = "SAFE";

        if (reportCount >= 5) riskLevel = "HIGH";
        else if (reportCount >= 2) riskLevel = "MEDIUM";
        else if (reportCount === 1) riskLevel = "LOW";

        return response.status(200).json({
            success: true,
            message: "Client check completed",
            data: {
                reportCount,
                riskLevel,
                reports
            },
            error: false
        });

    } catch (error) {
        console.log("Check error", error);

        return response.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
    }
};

// update status and verify by admin

// delete report entry




