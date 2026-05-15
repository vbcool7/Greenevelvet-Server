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

        if (!email && !mobile) {
            return response.status(400).json({
                message: "Email or mobile are required",
                success: false,
                error: true
            });
        }

        // Parallel execution for better speed
        const [emailRes, phoneRes] = await Promise.all([
            email ? axios.get(`https://emailreputation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_EMAIL_API_KEY}&email=${email}`).catch(e => null) : null,
            mobile ? axios.get(`https://phoneintelligence.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_PHONE_API_KEY}&phone=${mobile}`).catch(e => null) : null
        ]);

        // 📧 Email Data Mapping (Advanced)
        const emailData = emailRes ? {
            email: emailRes.data.email_address,
            isValid: emailRes.data.email_deliverability?.status === "deliverable",
            trustScore: Math.round(emailRes.data.email_quality?.score * 100),
            isDisposable: emailRes.data.email_quality?.is_disposable,
            riskLevel: emailRes.data.email_risk?.address_risk_status, // "low", "medium", "high"
            accountAgeDays: emailRes.data.email_quality?.minimum_age,
            breachCount: emailRes.data.email_breaches?.total_breaches || 0,
            provider: emailRes.data.email_sender?.email_provider_name
        } : null;

        // 📱 Phone Data Mapping (Advanced)
        const phoneData = phoneRes ? {
            number: phoneRes.data.phone_format?.international,
            isValid: phoneRes.data.phone_validation?.is_valid,
            type: phoneRes.data.phone_carrier?.line_type, // "mobile", "landline", "voip"
            isVoIP: phoneRes.data.phone_validation?.is_voip, // Red flag if true
            riskLevel: phoneRes.data.phone_risk?.risk_level,
            isDisposable: phoneRes.data.phone_risk?.is_disposable,
            location: `${phoneRes.data.phone_location?.city}, ${phoneRes.data.phone_location?.country_name}`,
            carrier: phoneRes.data.phone_carrier?.name
        } : null;

        // 🛡️ Final Verdict Logic (Escort ki help ke liye)
        // Agar dono safe hain toh client trusted hai
        let finalStatus = "Neutral";
        if (emailData?.riskLevel === "low" && phoneData?.riskLevel === "low" && !phoneData?.isVoIP) {
            finalStatus = "Highly Trusted ✅";
        } else if (emailData?.isDisposable || phoneData?.isDisposable || phoneData?.isVoIP) {
            finalStatus = "Potential Risk / Fake ❌";
        }

        return response.status(200).json({
            success: true,
            message: "Report generated successfully",
            finalStatus,
            emailData,
            phoneData
        });

    } catch (error) {
        console.error("Fetch client report failed error: ", error);
        return response.status(500).json({
            message: "Internal server error",
            success: false,
            error: true,
        });
    }
};


