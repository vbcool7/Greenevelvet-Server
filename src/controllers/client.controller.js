import bcryptjs from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import ClientModel from "../models/clientModel.js";
import { generatedclientId } from "../utils/generatedId.js";
import uploadImageCloudinary from "../utils/uploadImageCloudinary.js";
import EscortModel from "../models/escortModel.js";
import { sendVerificationEmail } from "../utils/emailService.js";
import { sendRegistrationNotification } from "../utils/sendRegistrationNotification.js";

// client register controll
export async function registerClientcontroller(request, response) {
    try {
        const { name, email, password, mobile } = request.body

        if (!name || !email || !password || !mobile) {
            return response.status(400).json({
                message: "Provide name, email, password, mobile",
                error: true,
                success: false
            })
        }

        const normalizedEmail = email.trim().toLowerCase();


        const exstingEmail = await EscortModel.findOne({ email: normalizedEmail })

        if (exstingEmail) {
            return response.status(401).json({
                message: "This email is already registered as Escort, You cannot register as Client with",
                success: false,
                error: true
            })
        }

        const client = await ClientModel.findOne({ email: normalizedEmail })

        if (client) {
            return response.status(401).json({
                message: "Already register email",
                error: true,
                success: false
            })
        }

        const clientId = await generatedclientId()

        const token = crypto.randomBytes(32).toString("hex")

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)

        const payload = {
            clientId,
            name,
            email: normalizedEmail,
            password: hashPassword,
            mobile,
            emailVerifyToken: token,
            emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        const newClient = new ClientModel(payload);
        const save = await newClient.save();

        const verifyLink = `https://greenvelvet-api.onrender.com/client/verify-email?token=${token}`;

        await sendVerificationEmail(normalizedEmail, verifyLink, clientId);

        await sendRegistrationNotification({ email: process.env.ADMIN_RECEIVER_EMAIL, modelName: name });


        return response.status(200).json({
            message: "User register successfully",
            error: false,
            success: true,
            data: save
        })

    } catch (error) {
        console.log("client registration error", error);

        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Client verify email controll
export async function clientVerifyEmail(request, response) {
    try {
        const { token } = request.query;

        const client = await ClientModel.findOne({
            emailVerifyToken: token,
            emailVerifyExpiry: { $gt: Date.now() },
        });

        if (!client) {
            return response.redirect("https://www.greenevelvet.com/link-expired");
        }

        client.isEmailVerified = true;
        client.emailVerifyToken = null;
        client.emailVerifyExpiry = null;

        await client.save();

        if (!client || !client.clientId) {
            return response.status(404).json({
                message: "Invalid client data",
                error: true,
                success: false
            });
        }

        response.redirect(`https://www.greenevelvet.com/login`);


    } catch (error) {
        console.log("email verification error :", error);

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        })
    }
}

// client logout controll
export async function logoutClientcontroller(request, response) {
    try {
        const { clientId, role } = request.body;

        if (!clientId || !role) {
            return res.status(400).json({
                message: "Invalid token",
                success: false,
                error: true
            });
        }

        const client = await ClientModel.findOne({ clientId: clientId });

        if (!client) {
            return response.status(404).json({
                message: "user not found",
                success: false,
                error: true,
            })

        }
        client.refresh_token = "";
        client.onlineStatus = false;
        await client.save();

        return response.status(200).json({
            message: "Logged out successfully",
            success: true,
            error: false,
        })

    } catch (error) {
        return response.status(500).json({
            message: "Internal server error",
            success: false,
            error: true,
        })
    }
}

// fetch client details
export async function fetchClientcontroller(request, response) {
    try {
        const { clientId } = request.query;

        if (!clientId) {
            return response.status(400).json({
                message: "provide clientId",
                success: false,
                error: true
            })
        }

        const clientDetails = await ClientModel.findOne({ clientId })

        if (clientDetails.length === 0) {
            return response.status(400).json({
                message: "client not found",
                success: false,
                error: true
            })
        }


        return response.status(200).json({
            message: "fetched success",
            success: true,
            error: false,
            data: clientDetails
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}

// upload Avatar
export async function uploadAvatarcontroller(request, response) {
    try {
        const { clientId } = request.body;

        if (!clientId) {
            return response.status(400).json({
                message: "clientId required",
                success: false,
                error: true
            })
        }

        if (!request.files?.avatar) {
            return response.status(401).json({
                message: "avatar required",
                success: false,
                error: true
            })
        }

        const avatarUpload = await uploadImageCloudinary(request.files.avatar[0], "profileImg/avatar");

        const uploadClient = await ClientModel.findOneAndUpdate(
            { clientId },
            {
                avatar: avatarUpload.secure_url,

            },
            { new: true }
        );

        if (!uploadClient) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "avatar uploaded successfully",
            success: true,
            error: false,
            data: {
                avatar: avatarUpload.secure_url,
            },
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }

}