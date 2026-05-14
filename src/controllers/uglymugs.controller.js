import UglyMugsModel from "../models/uglymugsModel.js";
import axios from "axios";


// create report
export const createUglyMug = async (request, response) => {
    try {
        const userId = request.user?._id;

        const { clientName, clientPhone, clientEmail, reason, incidentType, incidentDate, location, city, country } = request.body;

        if (!userId) {
            return response.status(400).json({
                message: "Unauthorized action",
                success: false,
                error: true
            });
        }

        if (!clientName || !clientPhone || !reason || !location || !incidentType || !incidentDate) {
            return response.status(400).json({
                message: "clientPhone, reason, location, incidentDate and incidentType are required.",
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

        const normalizeText = (value) => {
            return typeof value === "string"
                ? value.toLowerCase().trim()
                : value;
        };

        const formattedCity = normalizeText(city);
        const formattedCountry = normalizeText(country);

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
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            reason: reason.trim(),
            incidentType,
            city: formattedCity,
            country: formattedCountry,
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

// fetch all report for admin
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

// fetch all report for escorts
export const getAllUglyMugsEscorts = async (request, response) => {
    try {
        const data = await UglyMugsModel.find({ isActive: true })
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
        }).select(" clientName clientPhone clientEmail reason incidentType incidentDate location createdAt city");

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

// update Active or Deactive by admin
export const updateUglyMug = async (request, response) => {
    try {
        const { reportId, isActive, adminRemark } = request.body;

        if (!reportId) {
            return response.status(400).json({
                message: "reportId is required",
                success: false,
                error: true
            });
        }

        let updateData = {};

        if (typeof isActive === "boolean") {
            updateData.isActive = isActive;
        }

        if (typeof adminRemark === "string") {
            updateData.adminRemark = adminRemark.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return response.status(400).json({
                success: false,
                message: "Nothing to update"
            });
        }

        updateData.actionBy = request.user?._id;
        updateData.actionAt = new Date();

        const report = await UglyMugsModel.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        );

        if (!report) {
            return response.status(404).json({
                message: "Report not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Report updated successfully",
            success: true,
            error: false,
            data: report
        });

    } catch (error) {
        console.error("Update Report Error:", error);

        return response.status(500).json({
            message: error.message || "Error updating report",
            success: false,
            error: true
        });
    }
};

// delete report entry
export const deleteUglyMug = async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            return response.status(400).json({
                message: "Report Id is required",
                success: false,
                error: true
            });
        }

        const report = await UglyMugsModel.findByIdAndDelete(id);

        if (!report) {
            return response.status(404).json({
                message: "Report not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Report deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Delete Report Error:", error);

        return response.status(500).json({
            message: error.message || "Error deleting report",
            success: false,
            error: true
        });
    }
};



export const checkClientReport = async (request, response) => {
    try {

        const { email, mobile } = request.query;

        console.log("req query", request.query);

        if (!email && !mobile) {
            return response.status(400).json({
                message: "Email or mobile are required",
                success: false,
                error: true
            });
        }

        let emailCheck = null;
        let phoneCheck = null;

        if (email) {
            emailCheck = await axios.get(
                `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_EMAIL_API_KEY}&email=${email}`
            );
        }

        if (mobile) {
            phoneCheck = await axios.get(
                `https://phonevalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_PHONE_API_KEY}&phone=${mobile}`
            );
        }

        return response.status(200).json({
            success: true,
            message: "details fetch successfully",
            error: false,
            emailData: emailCheck ? {
                email: emailCheck.data.email,
                valid: emailCheck.data.is_valid_format?.value,
                deliverability: emailCheck.data.deliverability,
                disposable: emailCheck.data.is_disposable_email?.value
            } : null,

            phoneData: phoneCheck ? {
                valid: phoneCheck.data.valid,
                number: phoneCheck.data.format?.international,
                country: phoneCheck.data.country?.name,
                carrier: phoneCheck.data.carrier,
                type: phoneCheck.data.type
            } : null
        });

    } catch (error) {
        console.log("Fetch client report failed error: ", error);

        return response.status(500).json({
            message: error.response?.data || error.message,
            success: false,
            error: true,
        });

    }
};




