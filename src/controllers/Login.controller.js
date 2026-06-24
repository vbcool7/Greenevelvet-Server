import ClientModel from "../models/clientModel.js";
import EscortModel from "../models/escortModel.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import settingsModel from "../models/settingsModel.js";
import PendingEscortModel from "../models/PendingEscortModel.js";

// Escort and Client login control
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

        const settings = await settingsModel.findOne({});

        if (settings && settings?.enableLogin === false) {
            return response.status(403).json({
                message: "Login is temporarily disabled. Please try later.",
                success: false,
                error: true
            })
        }


        // 🔍 First check Escort


        let user = await PendingEscortModel.findOne({ email }).select("+password");
        let role = "Escort";

        if (!user) {
            user = await EscortModel.findOne({ email }).select("+password");
            role = "Escort";
        }

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

        // 🔐 Password check
        const checkPassword = await bcryptjs.compare(password, user.password);
        if (!checkPassword) {
            return response.status(401).json({
                message: "Check your password",
                success: false,
                error: true
            });
        }

        let _id = user?._id;


        if (user.status === "Pending" && user.role === "Escort") {

            const registrationSteps = {
                1: "/signupadvertiser",
                2: "/welcometogreenvelvet",
                3: "/confirmmobilenumber",
                4: "/profiledetails",
                5: "/identityverification",
                6: "/uploadprofileimage",
                7: "/uploadprofilegalleryphotos"
            };

            if (user.lastCompletedStep >= 7) {
                return response.status(200).json({
                    success: true,
                    message: "Your profile is under review. Please wait for admin approval.",
                    registrationCompleted: true,
                    verificationStatus: "Pending",
                });
            }

            const nextStep = user.lastCompletedStep + 1;

            if (user.lastCompletedStep === 1) {
                const redirectUrl = `${registrationSteps[nextStep]}/${user._id}`;
            } else {
                const redirectUrl = `${registrationSteps[nextStep]}/${user.escortId}`;
            }

            return response.status(403).json({
                message: "Please Complete your registration",
                success: false,
                error: true,
                registrationCompleted: false,
                escortId: user.escortId,
                lastCompletedStep: user.lastCompletedStep,
                nextStep,
                redirectUrl
            });
        }



        // ⚠️ Status check 
        if (user.status !== "Active") {
            return response.status(403).json({
                message: "Contact to admin",
                success: false,
                error: true
            });
        }

        if (!user.isEmailVerified) {
            return response.status(403).json({
                message: "Please verify your email before logging in.",
                success: false,
                error: true
            });
        }



        const payload = {
            userId: role === "Escort" ? user.escortId : user.clientId,
            role: role,
            _id: _id
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

        let redirectTo = role === "Escort" ? "/modeldashboard" : "/clientdashboard/profile";

        if (
            role === "Escort" &&
            settings?.enableSubscription &&
            !user?.subscriptionActive
        ) {
            redirectTo = "/subscription";
        }

        return response.json({
            message: "Login successful",
            success: true,
            error: false,
            data: {
                _id: user._id,
                escortId: role === "Escort" ? user.escortId : null,
                clientId: role === "Client" ? user.clientId : null,
                role: role,
                token: token,
                redirectTo,
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


