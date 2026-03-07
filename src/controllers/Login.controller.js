import ClientModel from "../models/clientModel.js";
import EscortModel from "../models/escortModel.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

export async function loginUsercontroller(request, response) {
    try {
        const { email, password } = request.body;

        if (!email || !password) {
            return response.status(400).json({
                message: "Provide email and password",
                success: false,
                error: true
            });
        }

        // 🔍 First check Escort
        let user = await EscortModel.findOne({ email }).select("+password");
        let role = "Escort";

        // 🔍 If not Escort → check Client
        if (!user) {
            user = await ClientModel.findOne({ email }).select("+password");
            role = "Client";
        }

        if (!user) {
            return response.status(401).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        // ⚠️ Status check only for Escort
        if (role === "Escort" && user.status !== "Active") {
            return response.status(403).json({
                message: "Contact to admin",
                success: false,
                error: true
            });
        }

        // 🔐 Password check
        const checkPassword = await bcryptjs.compare(password, user.password);
        if (!checkPassword) {
            return response.status(401).json({
                message: "Check your password",
                success: false,
                error: true
            });
        }

        const payload = {
            userId: role === "Escort" ? user.escortId : user.clientId,
            role: role
        };

        // Generate token
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        user.refresh_token = token;
        user.last_login_date = new Date();
        user.onlineStatus = true;
        await user.save();

        return response.json({
            message: "Login successful",
            success: true,
            error: false,
            data: {
                _id: user._id,
                escortId: role === "Escort" ? user.escortId : null,
                clientId: role === "Client" ? user.clientId : null,
                role: role,
                token: token
            }
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
}


