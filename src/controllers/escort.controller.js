import bcryptjs from "bcryptjs";
import jwt from 'jsonwebtoken';
import axios from "axios";
import EscortModel from '../models/escortModel.js'
import crypto from "crypto";
import { generatedescortId } from '../utils/generatedId.js'
import EscortdetailsModel from "../models/escortdetailsModel.js";
import EscortessentialModel from "../models/escortessentialModel.js";
import EscortpreferModel from "../models/escortpreferModel.js";
import uploadImageCloudinary from "../utils/uploadImageCloudinary.js";
import { sendVerificationEmail } from "../utils/emailService.js";
import otpModel from "../models/otpModel.js";
import uploadVideoCloudinary from "../utils/uploadVideoCloudinary.js";
import deleteImageCloudinary from "../utils/deleteImageCloudinary.js";
import deleteVideoCloudinary from "../utils/deleteVideoCloudinary.js";
import ServiceModel from "../models/escortserviceModel.js";
import RatesModel from "../models/escortratesModel.js";
import ClientModel from "../models/clientModel.js";
import { uploadMediaCloudinary } from "../utils/uploadMediaCloudinary.js";
import NewsAndTourModel from "../models/newsandtourModel.js";
import NewstourLikesModel from "../models/newstourLikesModel.js";
import NewstourCommentsModel from "../models/newstourCommentsModel.js";
import BlogModel from "../models/blogModel.js";
import BlogCommentsModel from "../models/blogCommentsModel.js";
import BlogLikesModel from "../models/blogLikesModel.js";
import BookingModel from "../models/bookingModel.js";
import TourModel from "../models/tourModel.js";
import { decrypt, encrypt } from "../utils/crypto.js";
import sharp from "sharp";
import { sendRegistrationNotification } from "../utils/sendRegistrationNotification.js";
import cloudinary from "../config/cloudinary.js";
import { sendMail } from "../utils/sendMail.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import { createAndSendNotification } from "../utils/notificationHelper.js";
import AdminModel from "../models/adminModel.js";
import NotificationModel from "../models/notificationModel.js";
import PendingEscortModel from "../models/PendingEscortModel.js";

// change password
export const escortChangePassword = async (request, response) => {
    try {
        const userId = request.user?._id;

        const { currentPassword, newPassword, confirmPassword } = request.body;

        // 1. Required check
        if (!currentPassword || !newPassword || !confirmPassword) {
            return response.status(400).json({
                message: "All fields are required",
                success: false,
                error: true
            });
        }

        // 2. New & confirm match
        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "New and Cinfirm Passwords do not match",
                success: false,
                error: true
            });
        }

        // 3. Password strength
        if (newPassword.length < 6) {
            return response.status(400).json({
                message: "Password must be at least 6 characters",
                success: false,
                error: true
            });
        }

        // 4. Find user
        const user = await EscortModel.findById(userId).select("+password");

        if (!user) {
            return response.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        // 5. Compare current password
        const isMatch = await bcryptjs.compare(currentPassword, user.password);

        if (!isMatch) {
            return response.status(400).json({
                message: "Current password is incorrect",
                success: false,
                error: true
            });
        }

        // 6. Prevent same password reuse
        const isSame = await bcryptjs.compare(newPassword, user.password);
        if (isSame) {
            return response.status(400).json({
                message: "New password cannot be same as old password",
                success: false,
                error: true
            });
        }

        // 7. Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);

        await EscortModel.findByIdAndUpdate(userId, {
            password: hashedPassword
        });

        return response.status(200).json({
            message: "Password updated successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Change Password Error:", error);

        return response.status(500).json({
            message: "Something went wrong",
            success: false,
            error: true
        });
    }
};

// forgot password send otp
export const escortForgotPassword = async (request, response) => {
    try {
        const { email } = request.body;

        if (!email) {
            return response.status(400).json({
                message: "Email is required",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findOne({ email });

        if (!escort) {
            return response.status(200).json({
                message: "If account exists, OTP sent",
                success: true,
                error: false
            });
        }

        // cooldown check (30 sec)
        if (escort.otpResendTime && escort.otpResendTime > Date.now()) {
            return response.status(429).json({
                message: "Please wait before requesting a new OTP",
                success: false,
                error: true
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcryptjs.hash(otp, 10);
        const expiry = Date.now() + 5 * 60 * 1000;
        const resendCooldown = Date.now() + 30 * 1000; // 30 sec

        console.log("otp", otp);

        const updated = await EscortModel.findOneAndUpdate(
            {
                email,
            },
            {
                resetOtp: hashedOtp,
                otpExpiry: expiry,
                otpResendTime: resendCooldown,
                otpAttempts: 0
            },
            { new: true }
        );

        if (!updated) {
            return response.status(429).json({
                message: "OTP already generated. Please wait",
                success: false,
                error: true
            });
        }

        const subject = "Password Reset OTP";

        const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Decor -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Logo Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">Verification Code</h2>
            <p style="margin:0;color:#555555;font-size:15px;line-height:22px;">
              Please use the one-time password (OTP) below to securely sign in or reset your password.
            </p>

            <!-- OTP Highlight -->
            <div style="margin:30px 0;background-color:#f0faf9;border-radius:10px;padding:20px;border:1px solid #d1efea;">
              <span style="display:block;font-size:12px;color:#00A68F;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Your OTP Code</span>
              <span style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:bold;color:#00A68F;letter-spacing:10px;">
                ${otp}
              </span>
            </div>

            <p style="margin:0;color:#888888;font-size:13px;">
              This code is valid for <b style="color:#333;">5 minutes</b>. <br>
              Security Note: Never share this code with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              &copy; ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Automatic security email, please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;
        try {
            await sendMail(email, subject, html);
        } catch (err) {
            console.log("email send error", err);

            await EscortModel.findByIdAndUpdate(escort._id, {
                resetOtp: null,
                otpExpiry: null
            });

            return response.status(500).json({
                message: "Failed to send OTP",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "OTP sent check email",
            success: true,
            error: false
        });

    } catch (error) {
        console.error("otp send error: ", error);

        return response.status(500).json({
            message: "Something went wrong",
            success: false,
            error: true
        });
    }
};

// verify otp
export const escortVerifyOtp = async (request, response) => {
    try {

        const { email, otp } = request.body;

        if (email == '' || otp == '') {
            return response.status(400).json({
                success: false,
                message: "Email and OTP required 1",
                error: true
            });
        }
        // 1. validation
        if (!email || !otp) {
            return response.status(400).json({
                success: false,
                message: "Email and OTP required",
                error: true
            });
        }

        // 2. find admin
        const escort = await EscortModel.findOne({ email });


        if (!escort || !escort.resetOtp) {
            return response.status(400).json({
                success: false,
                message: "Invalid request",
                error: true
            });
        }

        // 3. expiry check (safe)
        if (!escort.otpExpiry || escort.otpExpiry < Date.now()) {
            return response.status(400).json({
                success: false,
                message: "OTP expired",
                error: true
            });
        }

        // 4. attempts limit check
        if (escort.otpAttempts >= 5) {
            return response.status(429).json({
                success: false,
                message: "Too many attempts. Try again later",
                error: true
            });
        }

        // 5. OTP match
        const isMatch = await bcryptjs.compare(otp, escort.resetOtp);

        // ❌ WRONG OTP
        if (!isMatch) {
            await EscortModel.updateOne(
                { email },
                { $inc: { otpAttempts: 1 } }
            );

            return response.status(400).json({
                success: false,
                message: "Invalid OTP",
                error: true
            });
        }

        // 6. SUCCESS → clear OTP (NO save used)
        await EscortModel.updateOne(
            { email },
            {
                $unset: {
                    resetOtp: "",
                    otpExpiry: ""
                },
                $set: {
                    otpAttempts: 0
                }
            }
        );

        return response.status(200).json({
            success: true,
            message: "OTP verified successfully",
            error: false
        });

    } catch (error) {
        console.log("Verify OTP Error: ", error);

        return response.status(500).json({
            success: false,
            message: "Something went wrong",
            error: true
        });
    }
};

// reset password
export const escortResetPassword = async (request, response) => {
    try {
        const { email, newPassword, confirmPassword } = request.body;

        // 1. validation
        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                message: "All fields are required",
                success: false,
                error: true
            });
        }

        // 2. New & confirm match
        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: "New and Cinfirm Passwords do not match",
                success: false,
                error: true
            });
        }

        // 3. Password strength
        if (newPassword.length < 6) {
            return response.status(400).json({
                message: "Password must be at least 6 characters",
                success: false,
                error: true
            });
        }


        // 4. find admin
        const escort = await EscortModel.findOne({ email });

        if (!escort) {
            return response.status(400).json({
                message: "Invalid request",
                success: false,
                error: true
            });
        }

        // 5. security check → OTP must be verified already
        if (escort.resetOtp || escort.otpExpiry) {
            return response.status(403).json({
                message: "OTP not verified",
                success: false,
                error: true
            });
        }

        // 6. hash new password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        // 7. update password + clear any leftover fields (NO save)
        await EscortModel.updateOne(
            { email },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    resetOtp: "",
                    otpExpiry: ""
                },
                $setOnInsert: {
                    otpAttempts: 0
                }
            }
        );

        return response.status(200).json({
            success: true,
            message: "Password reset successfully",
            error: false
        });

    } catch (error) {
        console.error("Reset Password Error:", error);

        return response.status(500).json({
            success: false,
            message: "Something went wrong",
            error: true
        });
    }
};





// Escort Register controll step-1
export async function registerEscortcontroller(request, response) {
    try {

        const { name, email, password, mobile, country, countryCode, city, account_classification, account_type, adverties_category } = request.body

        console.log(request.body);

        if (!name || !email || !password || !mobile) {
            return response.status(400).json({
                message: "Provide name, email, password, mobile",
                error: true,
                success: false
            })
        }

        const normalizedEmail = email.trim().toLowerCase();

        const exstingEmail = await ClientModel.findOne({ email: normalizedEmail })

        if (exstingEmail) {
            return response.status(409).json({
                message: "This email is already registered as Client, You cannot register as Escort with",
                success: false,
                error: true
            })
        }

        const escort = await EscortModel.findOne({ email: normalizedEmail })

        if (escort) {
            return response.status(409).json({
                message: "Already register email",
                error: true,
                success: false
            })
        }

        // const escortId = await generatedescortId()

        const token = crypto.randomBytes(32).toString("hex");

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, salt);

        const payload = {
            name,
            email: normalizedEmail,
            password: hashPassword,
            country,
            countryCode,
            city,
            account_classification,
            account_type,
            adverties_category,
            emailVerifyToken: token,
            emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastCompletedStep: 1,
        }


        const pendingEscort = new PendingEscortModel(payload)
        const save = await pendingEscort.save()

        console.log("pendingEscort ", pendingEscort);


        const verifyLink = `https://greenvelvet-api.onrender.com/escort/verify-email?token=${token}`

        await sendVerificationEmail(normalizedEmail, verifyLink);

        return response.status(200).json({
            message: "Verification link sent to your email",
            error: false,
            success: true,
            data: {
                mobile: mobile,
                email: save.email,
                id: save._id,

            }
        })

    } catch (error) {
        console.log("Reg error", error);

        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// Escort verify email controll step-2
export async function verifyEmailcontroller(request, response) {
    try {
        const { token } = request.query;

        const pendingEscort = await PendingEscortModel.findOne({
            emailVerifyToken: token,
            emailVerifyExpiry: { $gt: Date.now() }
        }).select("+password");


        if (!pendingEscort) {

            const expiredEscort = await PendingEscortModel.findOne({
                emailVerifyToken: token
            });

            if (expiredEscort) {
                return response.redirect(
                    `https://www.greenevelvet.com/link-expired/${expiredEscort._id || ""}`
                );
            }

            return response.redirect(
                "https://www.greenevelvet.com/link-expired"
            );
        }

        // Safety check
        const existingEscort = await EscortModel.findOne({
            email: pendingEscort.email
        });

        if (existingEscort) {
            await PendingEscortModel.deleteOne({
                _id: pendingEscort._id
            });

            return response.status(409).json({
                message: "Escort already exists with this email",
                success: false,
                error: true
            });
        }

        const existingClient = await ClientModel.findOne({
            email: pendingEscort.email
        });

        if (existingClient) {
            await PendingEscortModel.deleteOne({
                _id: pendingEscort._id
            });

            return response.status(409).json({
                message: "This email is already registered as Client",
                success: false,
                error: true
            });
        }

        // Convert pending escort to plain object
        const escortData = pendingEscort.toObject();

        delete escortData._id;
        delete escortData.createdAt;
        delete escortData.updatedAt;

        escortData.isEmailVerified = true;
        escortData.emailVerifyToken = null;
        escortData.emailVerifyExpiry = null;
        escortData.lastCompletedStep = 2;

        // Id generate for new escort
        const escortId = await generatedescortId();

        escortData.escortId = escortId;

        // Create Escort
        const escort = await EscortModel.create(escortData);

        // Delete pending record
        await PendingEscortModel.deleteOne({
            _id: pendingEscort._id
        });


        if (!escort || !escort.escortId) {
            return response.status(400).json({
                message: "Failed to create escort account",
                error: true,
                success: false
            });
        }

        return response.redirect(`https://www.greenevelvet.com/confirmmobilenumber/${escort.escortId}`);


    } catch (error) {
        console.log("verifyEmailcontroller error", error);

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        })
    }
}

// Resend email verification
export async function resendEmailVerification(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                success: false,
                error: true,
                message: "Escort ID is required"
            });
        }

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                success: false,
                error: true,
                message: "Escort not found"
            });
        }

        if (escort.isEmailVerified) {
            return response.status(400).json({
                success: false,
                error: true,
                message: "Email already verified"
            });
        }

        // Generate new verification token
        const token = crypto.randomBytes(32).toString("hex");

        escort.emailVerifyToken = token;
        escort.emailVerifyExpiry = new Date(
            Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        );

        await escort.save();

        const verifyLink = `https://greenvelvet-api.onrender.com/escort/verify-email?token=${token}&escortId=${escort.escortId}`;

        await sendVerificationEmail(
            escort.email,
            verifyLink,
            escort.escortId
        );

        return response.status(200).json({
            success: true,
            error: false,
            message: "Verification email sent successfully"
        });

    } catch (error) {
        console.error("Resend Email Verification Error:", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || "Something went wrong"
        });
    }
}

// Escort change mobile number controll
export async function changeMobilenumber(request, response) {
    try {
        const { escortId, mobile, countryCode } = request.body;

        const mobileEncrypted = encrypt(request.body.mobile);


        if (!escortId || !mobile) {
            return response.status(400).json({
                message: "Escort Id and mobile is required",
                success: false,
                error: true
            })
        }

        const updateMobile = await EscortModel.findOneAndUpdate(
            { escortId },
            {
                mobile: mobileEncrypted,
                isMobileVerified: false,
                countryCode: countryCode,
            }
        )

        if (!updateMobile) {
            return response.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        return response.json({
            message: "Mobile number change successfully",
            success: true,
            error: false,
            data: {
                mobile: mobile,
                countryCode: countryCode,
            },
        });

    } catch (error) {
        console.log("change mobile error", error);

        if (error.code === 11000 && error.keyPattern?.mobile) {
            return response.status(400).json({
                success: false,
                message: "Mobile No. Already Exists"
            });
        }

        return response.json({
            message: error.message || error,
            success: false,
            error: true
        })

    }
}

// Escort send otp controll
export async function sendOtpcontroller(request, response) {
    try {

        const { escortId, mobile, countryCode } = request.body;

        console.log("req.body", request.body);

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(400).json({
                message: "Unauthorised access failed",
                success: false,
                error: true
            })
        }

        let escortMobile = escort.mobile;

        try {
            if (escortMobile?.startsWith("enc:")) {
                escortMobile = decrypt(escortMobile.replace("enc:", ""));
            } else {
                escortMobile = decrypt(escortMobile);
            }
        } catch {
            escortMobile = "";
        }


        // If mobile changed, check duplicate in Escorts
        if (escortMobile !== mobile) {

            const escorts = await EscortModel.find(
                { escortId: { $ne: escortId } },
                { mobile: 1, escortId: 1 }
            );

            for (const item of escorts) {

                let dbMobile = item.mobile;

                try {
                    if (dbMobile?.startsWith("enc:")) {
                        dbMobile = decrypt(dbMobile.replace("enc:", ""));
                    } else {
                        dbMobile = decrypt(dbMobile);
                    }
                } catch {
                    continue;
                }

                if (dbMobile === mobile) {
                    return response.status(400).json({
                        success: false,
                        error: true,
                        message: "Mobile No. Already Exists"
                    });
                }
            }

            // Check duplicate in Clients
            const clients = await ClientModel.find({}, { mobile: 1 });

            for (const client of clients) {

                let dbMobile = client.mobile;

                try {
                    if (dbMobile?.startsWith("enc:")) {
                        dbMobile = decrypt(dbMobile.replace("enc:", ""));
                    } else {
                        dbMobile = decrypt(dbMobile);
                    }
                } catch {
                    continue;
                }

                if (dbMobile === mobile) {
                    return response.status(400).json({
                        success: false,
                        error: true,
                        message: "Mobile No. Already Exists"
                    });
                }
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await otpModel.create({
            mobile,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
        });

        const fullMobile = countryCode + mobile;

        console.log("fullMobile", fullMobile);

        // Prepare SMS payload
        const smsPayload = {
            sms_text: `Your Greene Velvet OTP is ${otp}`,
            numbers: [fullMobile],
        };

        // Send SMS using Cellcast API
        const cellcastResponse = await axios.post(
            "https://cellcast.com.au/api/v3/send-sms",
            smsPayload,
            {
                headers: {
                    "APPKEY": process.env.CELLCAST_APPKEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Mobile no. and OTP ", fullMobile, otp);
        console.log("CELLCAST RESPONSE:", cellcastResponse.data);

        if (cellcastResponse?.data?.meta?.code === 200) {
            return response.status(200).json({
                success: true,
                error: false,
                message: "Otp Sent Successfully"
            });
        }

        if (cellcastResponse?.data?.meta?.status === "RECIPIENTS_ERROR") {
            return response.status(400).json({
                success: false,
                error: true,
                message: "Invalid Mobile Number"
            });
        }



    } catch (error) {
        console.log("OTP send error", error.response?.data);

        if (error.response?.data?.meta?.code === 400) {
            return response.status(400).json({
                success: false,
                error: true,
                message: "Invalid Mobile Number"
            });
        }

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }

}

// Escort verify mobile otp controll step-3
export async function verifyMobileotp(request, response) {
    try {

        let { escortId, mobile, otp, countryCode } = request.body; // 👈 let use karo

        console.log("verify otp , escortId ,mobile , contyrcode and otp ", escortId, mobile, countryCode, otp);

        if (!mobile || !otp) {
            return response.status(400).json({
                message: "Mobile and OTP required",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                message: "Unauthorized access",
                success: false,
                error: true
            });
        }

        const record = await otpModel.findOne({
            mobile,
            otp: otp,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        console.log("record", record);

        if (!record) {
            return response.status(400).json({
                message: "Invalid or expired OTP",
                success: false,
                error: true
            });
        }
        const mobileEncrypted = "enc:" + encrypt(mobile);

        await EscortModel.updateOne(
            { escortId },
            { $set: { isMobileVerified: true, mobile: mobileEncrypted, countryCode: countryCode, lastCompletedStep: 3 } } // ✅ correct field
        );

        record.isUsed = true;
        await record.save();

        return response.json({
            message: "Mobile verified successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.log("VERIFY OTP ERROR:", error);
        return response.status(500).json({
            message: error.message || "OTP verification failed",
            success: false,
            error: true
        });
    }
}

// Escort add details controll step-4
export async function escortdetailscontroller(request, response) {
    try {
        const { escortId, ...restData } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "EscortId missing",
                success: false,
                error: true
            })
        }


        // ✅ Link to main Escort table
        await EscortModel.findOneAndUpdate(
            { escortId },
            { $set: { ...restData, lastCompletedStep: 4 } },   // 👈 direct fields save
            { new: true, upsert: true }
        );


        return response.status(200).json({
            message: "Details saved ",
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Escort upload verification doc controll step-5
export async function escortUploadverification(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escort Id required",
                success: false,
                error: true
            })
        }

        if (!request.files?.verificationselfie || !request.files?.verificationgovtId) {
            return response.status(400).json({
                message: "Selfie and Govt Id required",
                success: false,
                error: true
            })
        }

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        const selfieUpload = await uploadImageCloudinary(request.files.verificationselfie[0], "verification/verificationselfie");
        const govtIdUpload = await uploadImageCloudinary(request.files.verificationgovtId[0], "verification/verificationgovtId");

        const uploadEscort = await EscortModel.findOneAndUpdate(
            { escortId },
            {
                verificationselfie: selfieUpload.secure_url,
                verificationgovtId: govtIdUpload.secure_url,
                docsuploadStatus: "pending",
                hasAcceptedDocsOwnership: true,
                docsOwnershipAcceptedAt: new Date(),
                lastCompletedStep: 5,

            },
            { new: true }
        );

        return response.json({
            message: "Verification documents uploaded successfully",
            success: true,
            error: false,
            data: {
                verificationselfie: selfieUpload.secure_url,
                verificationgovtId: govtIdUpload.secure_url,
            },
        });

    } catch (error) {
        console.log("docs upload error ", error);

        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }

}

// registration process upload gallery images  step-7
export async function registerGalleryController(request, response) {
    try {

        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId required",
                success: false,
                error: true
            });
        }

        if (!request.files || request.files.length < 3) {
            return response.status(400).json({
                message: "Minimum 3 images required",
                success: false,
                error: true
            });
        }

        if (request.files.length > 6) {
            return response.status(400).json({
                message: "Maximum 6 images allowed",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        let uploadedImages = [];

        for (let file of request.files) {

            const uploadResult = await uploadImageCloudinary(file, "gallery/images");

            uploadedImages.push({
                public_id: uploadResult.public_id,
                url: uploadResult.secure_url
            });
        }

        await EscortModel.updateOne(
            { escortId },
            {
                $set: {
                    "gallery.photos": uploadedImages,
                    hasAcceptedImageOwnership: true,
                    imageOwnershipAcceptedAt: new Date(),
                    lastCompletedStep: 7,
                }
            }
        );

        const updatedEscort = await EscortModel
            .findOne({ escortId })
            .lean();


        await sendRegistrationNotification({ email: process.env.ADMIN_RECEIVER_EMAIL, modelName: updatedEscort.name })


        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: admin._id,
                recipientModel: "Admin",
                senderId: updatedEscort._id,
                senderModel: "Escort",
                type: "VERIFICATION",
                title: "New Profile Awaiting Verification",
                message: `A new advertiser account (${updatedEscort.name}) has been created. Review documents and gallery images to verify`,
                link: `/dashboard/awaiting-verification`
            });
        }

        return response.status(200).json({
            message: "Gallery uploaded successfully",
            success: true,
            error: false,
            data: updatedEscort
        });

    } catch (error) {

        console.error(error);

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        });
    }
}

// Subcribe plan controll
export async function subcribePlans(request, response) {
    try {
        const { title, plan } = request.body;
        return response.status(400).json({
            message: "",
            success: false,
            error: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}

// Escort Login controll
export async function escortLogincontroller(request, response) {
    try {
        const { email, password } = request.body;

        if (!email || !password) {
            return response.status(400).json({
                message: "Provide email, and password",
                success: false,
                error: true
            })
        }

        const escort = await EscortModel.findOne({ email }).select("+password");

        if (!escort) {
            return response.status(400).json({
                message: "User not register",
                success: false,
                error: true
            })
        }

        console.log("escort details ", escort);

        if (escort.status !== "Active") {
            return response.status(400).json({
                message: "Contact to admin",
                success: false,
                error: true
            })
        }

        const checkPassword = await bcryptjs.compare(password, escort.password);

        if (!checkPassword) {
            return response.status(400).json({
                message: "check your password",
                success: false,
                error: true
            })
        }

        const token = jwt.sign(
            {
                _id: escort._id,
                escortId: escort.escortId,
                role: escort.role || "Escort"
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return response.json({
            message: "Login successful",
            success: true,
            error: false,
            data: {
                _id: escort._id,
                escortId: escort.escortId,
                role: escort.role,
                token: token
            }

        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }

}

// Fetch Escort details 
export async function fetchEscortdetailscontroller(request, response) {
    try {
        const { escortId } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "provide escortId",
                error: true,
                success: false
            })
        }

        const escortDetails = await EscortModel.findOne({ escortId })
            .populate("escortdetail")
            .populate("escortessential")
            .populate("escortprefer")
            .populate("services")
            .populate("rates")
            .populate("bookings")

        if (!escortDetails) {
            return response.status(400).json({
                message: "escorts not found",
                error: true,
                success: false
            })
        }
        let mobile = escortDetails.mobile;

        try {
            if (mobile?.startsWith("enc:")) {
                mobile = decrypt(mobile.replace("enc:", ""));
            } else {
                mobile = decrypt(mobile);
            }
        } catch {
            mobile = "";
        }

        escortDetails.mobile = mobile;

        return response.status(200).json({
            message: "Escort details fetched",
            error: false,
            success: true,
            data: escortDetails
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// logout controll
export async function logoutEscortcontroller(request, response) {
    try {
        const { escortId, role } = request.body;

        if (!escortId || !role) {
            return response.status(400).json({
                message: "Invalid token",
                success: false,
                error: true
            });
        }


        const escort = await EscortModel.findOne({ escortId: escortId });

        if (!escort) {
            return response.status(404).json({
                message: "escort not found",
                success: false,
                error: true,
            })

        }
        escort.refresh_token = "";
        escort.onlineStatus = false;
        await escort.save();

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

// upload Avatar step-6
export async function uploadAvatarcontroller(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escort Id required",
                success: false,
                error: true
            })
        }

        if (!request.files?.avatar) {
            return response.status(400).json({
                message: "profile image required",
                success: false,
                error: true
            })
        }

        const existingEscort = await EscortModel.findOne({ escortId });

        if (!existingEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        if (existingEscort?.avatar?.public_id) {

            await deleteFromCloudinary(existingEscort.avatar.public_id);

        }

        const avatarUpload = await uploadImageCloudinary(request.files.avatar[0], "profileImg/avatar");

        const uploadEscort = await EscortModel.findOneAndUpdate(
            { escortId },
            {
                avatar: {
                    url: avatarUpload.secure_url,
                    public_id: avatarUpload.public_id,
                    status: "Pending"
                },
                hasAcceptedAvatarOwnership: true,
                avatarOwnershipAcceptedAt: new Date(),
                lastCompletedStep: 6,
            },
            { new: true }
        );

        if (!uploadEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            if (uploadEscort.status === "Active") {
                const load = await createAndSendNotification(request.app, {
                    recipientId: admin._id,
                    recipientModel: "Admin",
                    senderId: uploadEscort._id,
                    senderModel: "Escort",
                    type: "VERIFICATION",
                    title: "New Profile image upload",
                    message: `${uploadEscort.name} has upload new profile image and is waiting for approval.`,
                    link: `/viewescortprofile/${uploadEscort._id}`
                });
            }
        }


        return response.status(200).json({
            message: "profile image uploaded successfully",
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

export async function toggleFaceBlur(request, response) {
    try {
        const userId = request.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findById(userId);

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        // 🔁 Toggle
        escort.isFaceBlurred = !escort.isFaceBlurred;
        await escort.save();

        return response.status(200).json({
            success: true,
            message: `Face blur ${escort.isFaceBlurred ? "enabled" : "disabled"}`,
            isFaceBlurred: escort.isFaceBlurred,
            error: false
        });

    } catch (error) {
        console.log("Toggle error", error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
}

// upload gallery images
export async function uploadImagescontroller(request, response) {
    try {
        const { escortId, deletedImages } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId required",
                success: false,
                error: true
            });
        }

        const deletedArr = deletedImages ? JSON.parse(deletedImages) : [];

        // 1️⃣ Delete images from Cloudinary & DB
        if (deletedArr.length > 0) {
            const escort = await EscortModel.findOne({ escortId });
            if (escort) {
                // Cloudinary delete
                for (let item of deletedArr) {
                    if (item.public_id) {
                        await deleteImageCloudinary(item.public_id);
                    }
                }

                // DB delete by URL
                const urlsToDelete = deletedArr.map(item => item.url).filter(Boolean);
                if (urlsToDelete.length > 0) {
                    await EscortModel.updateOne(
                        { escortId },
                        { $pull: { "gallery.photos": { url: { $in: urlsToDelete } } } }
                    );
                }
            }
        }

        // 2️⃣ Upload new images to Cloudinary
        let uploadedImages = [];
        if (request.files && request.files.length > 0) {
            for (let file of request.files) {
                const uploadResult = await uploadImageCloudinary(file, "gallery/images");
                uploadedImages.push({
                    public_id: uploadResult.public_id,
                    url: uploadResult.secure_url
                });
            }

            // Push new images to DB
            await EscortModel.updateOne(
                { escortId },
                {
                    $push: {
                        "gallery.photos": { $each: uploadedImages },
                    },
                    $set: {
                        hasAcceptedImageOwnership: true,
                        imageOwnershipAcceptedAt: new Date()
                    },
                }
            );
        }

        // 3️⃣ Fetch updated escort
        const updatedEscort = await EscortModel.findOne({ escortId }).lean();

        // 4️⃣ Keep only last 6 images in DB
        const last6Images = updatedEscort.gallery.photos.slice(-6);
        await EscortModel.updateOne(
            { escortId },
            { $set: { "gallery.photos": last6Images } }
        );

        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: admin._id,
                recipientModel: "Admin",
                senderId: updatedEscort._id,
                senderModel: "Escort",
                type: "VERIFICATION",
                title: "New gallery images uploaded",
                message: `${updatedEscort.name} has uploaded a gallery images and is waiting for approval.`,
                link: `/viewescortprofile/${updatedEscort._id}`
            });
        }

        return response.status(200).json({
            message: "Gallery updated successfully",
            success: true,
            error: false,
            data: {
                ...updatedEscort,
                gallery: {
                    ...updatedEscort.gallery,
                    photos: last6Images
                }
            }
        });

    } catch (error) {
        console.error(error);
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        });
    }
}

// upload gallery videos
export async function uploadVideoscontroller(request, response) {
    try {
        const { escortId, deletedVideos } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId required",
                success: false,
                error: true
            });
        }

        const deletedArr = deletedVideos ? JSON.parse(deletedVideos) : [];

        // 1️⃣ Delete videos from Cloudinary & DB
        if (deletedArr.length > 0) {
            const escort = await EscortModel.findOne({ escortId });
            if (escort && escort.gallery?.videos?.length) {

                // Cloudinary delete
                for (let urlOrObj of deletedArr) {
                    // If frontend sends { public_id, url } object
                    if (typeof urlOrObj === "object" && urlOrObj.public_id) {
                        await deleteVideoCloudinary(urlOrObj.public_id);
                    }
                }

                // DB delete using URL
                const urlsToDelete = deletedArr.map(item => (typeof item === "object" ? item.url : item)).filter(Boolean);
                if (urlsToDelete.length > 0) {
                    await EscortModel.updateOne(
                        { escortId },
                        { $pull: { "gallery.videos": { url: { $in: urlsToDelete } } } }
                    );
                }
            }
        }

        // 2️⃣ Upload new videos to Cloudinary
        let uploadedVideos = [];
        if (request.files && request.files.length > 0) {
            for (let file of request.files) {
                const uploadResult = await uploadVideoCloudinary(file, "gallery/videos");
                uploadedVideos.push({
                    public_id: uploadResult.public_id,
                    url: uploadResult.secure_url
                });
            }

            // Push new videos to DB
            await EscortModel.updateOne(
                { escortId },
                {
                    $push: {
                        "gallery.videos": { $each: uploadedVideos },
                    },
                    $set: {
                        hasAcceptedVideoOwnership: true,
                        videoOwnershipAcceptedAt: new Date()
                    }
                }
            );
        }

        // 3️⃣ Fetch updated escort
        const updatedEscort = await EscortModel.findOne({ escortId }).lean();

        // 4️⃣ Keep only last 6 videos
        const last6Videos = updatedEscort.gallery.videos.slice(-6);
        await EscortModel.updateOne(
            { escortId },
            { $set: { "gallery.videos": last6Videos } }
        );

        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: admin._id,
                recipientModel: "Admin",
                senderId: updatedEscort._id,
                senderModel: "Escort",
                type: "VERIFICATION",
                title: "New gallery videos uploaded",
                message: `${updatedEscort.name} has uploaded a gallery videos and is waiting for approval.`,
                link: `/viewescortprofile/${updatedEscort._id}`
            });
        }

        return response.status(200).json({
            message: "Video gallery updated successfully",
            success: true,
            error: false,
            data: {
                ...updatedEscort,
                gallery: {
                    ...updatedEscort.gallery,
                    videos: last6Videos
                }
            }
        });

    } catch (error) {
        console.error(error);
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        });
    }
}



// fetch all verified escorts
export async function verifiedEscortcontroller(request, response) {
    try {
        const { role, isVerified, isVisible } = request.query;

        let filter = {};

        if (role) filter.role = role;

        if (isVerified !== undefined)
            filter.isVerified = isVerified === "true";

        if (isVisible !== undefined)
            filter.isVisible = isVisible === "true";

        const escorts = await EscortModel.find(filter);

        if (escorts.length === 0) {
            return response.status(400).json({
                message: "escorts not found",
                error: true,
                success: false
            })
        }

        return response.status(200).json({
            message: "Escort list fetched",
            error: false,
            success: true,
            data: escorts
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// ------------------x-x-x-x-x-< Not completed >-x-x-x-x-x--------------------
export async function updateEscortcontroller(request, response) {
    try {
        const escortId = request.user._id

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// update highlights 
export async function updateHighlightscontroller(request, response) {
    try {
        const { escortId, incall, outcall, rateFrom, highlights, about } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId is missing!",
                success: false,
                error: true
            });
        }

        const updateData = {};

        if (incall !== undefined) updateData.incall = incall;
        if (outcall !== undefined) updateData.outcall = outcall;
        if (highlights) updateData.highlights = highlights;
        if (about) updateData.about = about;
        if (rateFrom) updateData.rateFrom = rateFrom;


        const details = await EscortModel.findOneAndUpdate(
            { escortId: escortId },
            { $set: updateData },
            { new: true }   // upsert mat lagao unless naya doc banana ho
        );

        if (!details) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Update successful",
            success: true,
            error: false,
            data: details
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
}

// escort services
export async function escortServicescontroller(request, response) {
    try {
        const { escortId, title, label, price, description, isActive } = request.body;

        // ✅ correct validation
        if (!escortId) {
            return response.status(400).json({
                message: "escortId is missing",
                success: false,
                error: true
            });
        }

        // ✅ create service
        const newService = await ServiceModel.create({
            escortId,
            title,
            label,
            price,
            description,
            isActive
        });

        // ✅ push service _id into Escort model
        await EscortModel.findOneAndUpdate(
            { escortId: escortId },
            { $push: { services: newService._id } }
        );

        return response.status(200).json({
            message: "Service added successfully",
            success: true,
            error: false,
            data: newService
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });
    }
}

// update service
export async function UpdateService(request, response) {

    try {

        const {
            _id,
            escortId,
            title,
            label,
            price,
            description,
            isActive
        } = request.body;

        // validation
        if (!_id) {

            return response.status(400).json({
                message: "Service id is missing",
                success: false,
                error: true
            });

        }

        const service = await ServiceModel.findById(_id);

        // not found
        if (!service) {

            return response.status(404).json({
                message: "Service not found",
                success: false,
                error: true
            });

        }

        // update
        const updatedService = await ServiceModel.findByIdAndUpdate(
            _id,
            {
                escortId,
                title,
                label,
                price,
                description,
                isActive
            },
            {
                new: true
            }
        );

        return response.status(200).json({
            message: "Service updated successfully",
            success: true,
            error: false,
            data: updatedService
        });

    } catch (error) {
        console.log("service update error ", error);

        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }

}

// delete services
export async function DeleteService(request, response) {

    try {

        const { _id } = request.body;

        // validation
        if (!_id) {

            return response.status(400).json({
                message: "Service id is missing",
                success: false,
                error: true
            });

        }

        // check service
        const service = await ServiceModel.findById(_id);

        if (!service) {

            return response.status(404).json({
                message: "Service not found",
                success: false,
                error: true
            });

        }

        // delete
        await ServiceModel.findByIdAndDelete(_id);

        await EscortModel.findOneAndUpdate(
            { escortId: service.escortId },
            {
                $pull: {
                    services: _id
                }
            }
        );


        return response.status(200).json({
            message: "Service deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.log("service delete error ", error);
        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }

}



// escort rates
export async function escortRatescontroller(request, response) {
    try {
        const { escortId, label, price, duration, isActive } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId is missing",
                success: false,
                error: true
            });
        }

        // ✅ create rates
        const newRates = await RatesModel.create({
            escortId,
            label,
            price,
            duration,
            isActive
        });

        if (!newRates) {
            return response.status(404).json({
                message: "rates add failed",
                success: false,
                error: true
            })
        }

        // ✅ push rates _id into Escort model
        await EscortModel.findOneAndUpdate(
            { escortId: escortId },
            { $push: { rates: newRates._id } }
        );

        return response.status(200).json({
            message: "rates added successfully",
            success: true,
            error: false,
            data: newRates
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });
    }
}

// escort update rate
export async function updateRate(request, response) {

    try {

        const {
            _id,
            escortId,
            label,
            price,
            duration,
            isActive
        } = request.body;

        if (!_id) {

            return response.status(400).json({
                message: "Rate id is missing",
                success: false,
                error: true
            });

        }

        // check existing rate
        const rate = await RatesModel.findById(_id);

        if (!rate) {

            return response.status(404).json({
                message: "Rate not found",
                success: false,
                error: true
            });

        }

        // update rate
        const updatedRate = await RatesModel.findByIdAndUpdate(
            _id,
            {
                escortId,
                label,
                price,
                duration,
                isActive
            },
            {
                new: true
            }
        );

        return response.status(200).json({
            message: "Rate updated successfully",
            success: true,
            error: false,
            data: updatedRate
        });

    } catch (error) {
        console.log("update rate error", error);

        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }

}

// escort rate delete 
export async function deleteRate(request, response) {

    try {

        const { _id } = request.body;

        if (!_id) {

            return response.status(400).json({
                message: "Rate id is missing",
                success: false,
                error: true
            });

        }

        // check existing rate
        const rate = await RatesModel.findById(_id);

        if (!rate) {

            return response.status(404).json({
                message: "Rate not found",
                success: false,
                error: true
            });

        }

        // delete rate
        await RatesModel.findByIdAndDelete(_id);

        // remove rate id from escort model
        await EscortModel.findOneAndUpdate(
            { escortId: rate.escortId },
            {
                $pull: {
                    rates: _id
                }
            }
        );

        return response.status(200).json({
            message: "Rate deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.log("delete rate error", error);

        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }

}


// fetch escorts added services  => not in use bcoz -> use populate and fetch rates and services
export async function fetchescortServicescontroller(request, response) {
    try {
        const { escortId } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId is missing",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "fetched services",
            success: true,
            error: false,
            data: services
        });


    } catch (error) {
        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });
    }
}

// filter city escorts
export async function fetchFiltercityescortscontroller(request, response) {
    try {
        let filters = { ...request.query };

        // ✅ Boolean conversion
        for (const key in filters) {
            if (filters[key] === "true") filters[key] = true;
            else if (filters[key] === "false") filters[key] = false;
        }
        // 🔹 Parse filters
        for (const key in request.query) {
            if (key.startsWith("filters[")) {
                const actualKey = key.replace(/^filters\[(.*)\]$/, "$1");
                let value = request.query[key];

                if (value === "true") value = true;
                else if (value === "false") value = false;

                if (value !== "" && value !== null && value !== undefined) {
                    filters[actualKey] = value;
                }
            }
        }


        // 🔹 Build query (ONLY EscortModel fields)
        const query = {};

        if (filters.city) query.city = filters.city;
        if (filters.country) query.country = filters.country;

        if (filters.name) {
            query.name = { $regex: filters.name, $options: "i" };
        }
        if (filters.isVerified === true) query.isVerified = true;
        if (filters.isVisible === true) query.isVisible = true;
        if (filters.incall === true) query.incall = true;
        if (filters.outcall === true) query.outcall = true;
        if (filters.fmty === true) query.fmty = true;

        if (filters.adverties_category && filters.adverties_category !== "Any") {
            query.adverties_category = filters.adverties_category;
        }

        if (filters.account_type && filters.account_type !== "All") {
            query.account_type = filters.account_type;
        }

        if (filters.escortFor && filters.escortFor !== "Anyone") {
            query.escortFor = filters.escortFor;
        }

        // ✅ GENDER (single value in DB)
        // Gender fix
        const genderKey = filters.gender || filters["gender[]"];
        if (genderKey && genderKey.length > 0 && !genderKey.includes("All")) {
            query.gender = { $in: genderKey };
        }

        // ✅ OTHER FIELDS (same model)
        if (filters.ethnicity && filters.ethnicity !== "Any") {
            query.ethnicity = filters.ethnicity;
        }

        if (filters.bustSize && filters.bustSize !== "Any") {
            query.bustSize = filters.bustSize;
        }

        if (filters.hairColor && filters.hairColor !== "Any") {
            query.hairColor = filters.hairColor;
        }

        // ---------- AGE RANGE ----------
        if (filters.age) {
            if (filters.age.includes("-")) {
                const [min, max] = filters.age.split("-").map(Number);
                query.age = { $gte: min, $lte: max };
            } else if (filters.age.includes("+")) {
                const min = Number(filters.age.replace("+", ""));
                query.age = { $gte: min };
            }
        }

        // ---------- RATE RANGE ----------
        if (filters.rateFrom) {
            const minRate = Number(filters.rateFrom.replace("+", ""));
            query.rateFrom = { $gte: minRate };
        }

        query["avatar.url"] = {
            $exists: true,
            $nin: [null, ""]
        };

        query["avatar.status"] = "Approved";

        // 🔹 Fetch escorts (NO populate)
        const escortList = await EscortModel.find(query)
            .populate("bookings");


        if (escortList.length === 0) {
            return response.status(404).json({
                message: "No escorts found",
                success: false,
                error: true,
            });
        }

        return response.status(200).json({
            message: "Filtered escorts fetched",
            data: escortList,
            success: true,
            error: false,
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        });
    }
}

// filter home escorts
export async function fetchFilterHomescortscontroller(request, response) {
    try {
        const {
            isVerified,
            isVisible,
            role,
            country,
            city,
            name,
            keyword,
            gender,
            account_type,
            adverties_category,
            page = 1,
            limit = 15,
        } = request.query; // query params se filter lenge

        const query = {};

        if (role) query.role = role;
        if (isVerified) query.isVerified = isVerified === "true"; // query params are strings
        if (isVisible) query.isVisible = isVisible === "true";

        if (country) query.country = country.toUpperCase();
        if (city) query.city = city.toUpperCase();
        if (name) query.name = name;

        if (gender && gender !== "All") query.gender = gender;
        if (account_type && account_type !== "All") query.account_type = account_type;
        if (adverties_category && adverties_category !== "Any") query.adverties_category = adverties_category;
        // keyword search on name or highlights
        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: "i" } },
                { city: { $regex: keyword, $options: "i" } },
                { highlights: { $regex: keyword, $options: "i" } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Only escorts with avatar
        query.avatar = { $exists: true, $ne: null, $ne: "" };

        const escortList = await EscortModel.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .select("escortId name age city country gender account_type adverties_category highlights avatar rateFrom isFaceBlurred")
            .lean();

        const total = await EscortModel.countDocuments(query);


        if (!escortList || escortList.length === 0) {
            return response.status(404).json({
                message: "No escorts found",
                success: false,
                error: true,
                data: [],
                total: 0
            });
        }

        return response.status(200).json({
            message: "Filtered escorts fetched",
            data: escortList,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            success: true,
            error: false,
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        });
    }
}

// advance search 
export const advanceSearchController = async (request, response) => {
    try {
        const filters = request.query; // ?city=DELHI&country=INDIA&incall=true...

        let query = {};

        // ---------- booleans ----------
        if (filters.isVerified === "true") query.isVerified = true;
        if (filters.isVisible === "true") query.isVisible = true;
        if (filters.isAvailable === "true") query.isAvailable = true;
        if (filters.tour === "true") query.tour = true;
        if (filters.video === "true") query.video = true;

        if (filters.incall === "true") query.incall = true;
        if (filters.outcall === "true") query.outcall = true;
        if (filters.fmty === "true") query.fmty = true;

        // ---------- location (CAPITAL match) ----------
        if (filters.country) query.country = filters.country;
        if (filters.city) query.city = filters.city;

        // ---------- strings ----------
        if (filters.day) query.day = filters.day;
        if (filters.adverties_category)
            query.adverties_category = filters.adverties_category;
        if (filters.escortFor) query.escortFor = filters.escortFor;
        if (filters.account_type) query.account_type = filters.account_type;
        if (filters.dressSize) query.dressSize = filters.dressSize;
        if (filters.hairColor) query.hairColor = filters.hairColor;

        // ---------- age range ----------
        if (filters.ageMin || filters.ageMax) {
            query.age = {};
            if (filters.ageMin) query.age.$gte = Number(filters.ageMin);
            if (filters.ageMax) query.age.$lte = Number(filters.ageMax);
        }

        // ---------- time window ----------
        if (filters.timeFrom && filters.timeTo) {
            query.availableTime = {
                $gte: filters.timeFrom,
                $lte: filters.timeTo,
            };
        }

        query["avatar.url"] = {
            $exists: true,
            $nin: [null, ""]
        };

        query["avatar.status"] = "Approved";

        // ---------- Aggregation Pipeline ----------
        let pipeline = [
            // join services
            {
                $lookup: {
                    from: "services",
                    localField: "services",
                    foreignField: "_id",
                    as: "serviceData",
                },
            },
            { $unwind: { path: "$serviceData", preserveNullAndEmptyArrays: true } },

            // join rates
            {
                $lookup: {
                    from: "rates",
                    localField: "rates",
                    foreignField: "_id",
                    as: "rateData",
                },
            },
            { $unwind: { path: "$rateData", preserveNullAndEmptyArrays: true } },

            // base filters
            { $match: query },
        ];

        // ---------- service filter (UI: service=massage) ----------
        if (filters.service) {
            pipeline.push({
                $match: { "serviceData.title": filters.service },
            });
        }

        // ---------- duration filter (UI: duration=30 min) ----------
        if (filters.duration) {
            pipeline.push({
                $match: { "rateData.duration": filters.duration },
            });
        }

        // ---------- rate range (UI: rateMin, rateMax) ----------
        if (filters.rateMin || filters.rateMax) {
            let rateQuery = {};
            if (filters.rateMin) rateQuery.$gte = Number(filters.rateMin);
            if (filters.rateMax) rateQuery.$lte = Number(filters.rateMax);

            pipeline.push({
                $match: { "rateData.price": rateQuery },
            });
        }

        // ✅ ---------- REMOVE DUPLICATES ----------
        pipeline.push({
            $group: {
                _id: "$_id",
                doc: { $first: "$$ROOT" },
            },
        });

        pipeline.push({
            $replaceRoot: { newRoot: "$doc" },
        });

        const escorts = await EscortModel.aggregate(pipeline);

        return response.json({
            message: "Escort found",
            success: true,
            error: false,
            count: escorts.length,
            data: escorts,
        });

    } catch (error) {
        response.status(500).json({
            message: "Advance search failed",
            success: false,
            error: true,
        });
    }
};

// ===================================================< News&Tour controlls >============================================================

// Add NewsandTour 
export const createNewsTourcontroller = async (request, response) => {
    try {

        const { escortId, userId, name, city, country, title, description } = request.body;


        if (!escortId || !title || !description) {
            return response.status(400).json({
                message: "escortId, title and description are required",
                success: false,
                error: true,
            });
        }

        // ✅ file validation
        if (!request.files || request.files.length === 0) {
            return response.status(400).json({
                message: "At least 1 media file required",
                success: false,
                error: true,
            });
        }

        if (request.files.length > 3) {
            return response.status(400).json({
                message: "Maximum 3 media files allowed",
                success: false,
                error: true,
            });
        }

        // ✅ check escort exist
        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true,
            });
        }

        // ✅ upload media to cloudinary
        const mediaUploads = await Promise.all(
            request.files.map(async (file) => {

                const result = await uploadMediaCloudinary(
                    file,
                    "newsandtour/post"
                );

                return {
                    url: result.secure_url,
                    public_id: result.public_id,
                    type: file.mimetype.startsWith("video") ? "video" : "image"
                };
            })
        );

        // ✅ create post
        const post = await NewsAndTourModel.create({
            escortId,
            userId,
            city,
            country,
            name,
            title,
            description,
            status: "active",
            media: mediaUploads
        });

        // ✅ push post id into escort model
        const updatedEscort = await EscortModel.findOneAndUpdate(
            { escortId },
            { $push: { newsTour: post._id } }
        );


        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: admin._id,
                recipientModel: "Admin",
                senderId: updatedEscort._id,
                senderModel: "Escort",
                type: "NEW POST",
                title: "New News and tour published",
                message: `${updatedEscort.name} has published a new news and tour. Click to review.`,
                link: `/dashboard/newsandtours-moderation`
            });
        }

        return response.status(201).json({
            message: "News & Tour post created successfully",
            success: true,
            error: false,
            data: post
        });


    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server Error",
            success: false,
            error: true
        });
    }
};

// individual escorts newsandtour post fetch 
export const fetchEscortNewsTourcontroller = async (request, response) => {
    try {
        const { escortId } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "EscortId not found",
                success: false,
                error: true,
            });
        }

        const posts = await NewsAndTourModel
            .find({ escortId: escortId, status: "active" })
            .populate("userId", "name")
            .sort({ createdAt: -1 })
            .limit(20)
            .populate("newstourComments")
            .populate("newstourLikes");

        return response.status(200).json({
            message: "Posts fetched successfully",
            success: true,
            error: false,
            data: posts
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server Error",
            success: false,
            error: true
        })
    }

}

// update NewsTour
export const updateNewsTourController = async (request, response) => {
    try {

        const { _id, title, description } = request.body;

        console.log("request.body: ", request.body);

        if (!_id) {
            return response.status(400).json({
                message: "Post _id required",
                success: false,
                error: true
            });
        }

        const post = await NewsAndTourModel.findById(_id);

        console.log("post: ", post);

        if (!post) {
            return response.status(404).json({
                message: "Post not found",
                success: false,
                error: true
            });
        }

        let mediaUploads = post.media;

        if (request.files && request.files?.length > 0) {

            if (request.files.length > 3) {
                return response.status(400).json({
                    message: "Maximum 3 media allowed",
                    success: false,
                    error: true
                });
            }

            // delete old media from cloudinary
            if (post.media && post.media?.length > 0) {
                for (let m of post.media) {

                    if (m.public_id) {
                        await cloudinary.uploader.destroy(
                            m.public_id,
                            {
                                resource_type: m.type === "video" ? "video" : "image"
                            }
                        );
                    }
                }
            }

            // upload new media
            mediaUploads = await Promise.all(
                request.files.map(async (file) => {

                    const result = await uploadMediaCloudinary(
                        file,
                        "newsandtour/post"
                    );

                    return {
                        url: result.secure_url,
                        public_id: result.public_id,
                        type: result.resource_type || (
                            file.mimetype.startsWith("video")
                                ? "video"
                                : "image"
                        )
                    };
                })
            );
        }

        // update post
        const updatedPost = await NewsAndTourModel.findByIdAndUpdate(
            _id,
            {
                title: title || post.title,
                description: description || post.description,
                media: mediaUploads
            },
            { new: true }
        );

        return response.status(200).json({
            message: "Post updated successfully",
            success: true,
            error: false,
            data: updatedPost
        });

    } catch (error) {

        console.log("updateNewsTourController error:", error);

        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }
};

// Delete NewsTour
export const deleteNewsTourController = async (request, response) => {
    try {

        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Post _id required",
                success: false,
                error: true
            });
        }

        const post = await NewsAndTourModel.findById(_id);

        if (!post) {
            return response.status(404).json({
                message: "Post not found",
                success: false,
                error: true
            });
        }

        // ✅ Delete media from cloudinary
        if (post.media && post.media.length > 0) {

            for (let m of post.media) {

                if (m.public_id) {
                    await cloudinary.uploader.destroy(
                        m.public_id,
                        {
                            resource_type: m.type === "video" ? "video" : "image"
                        }
                    );
                }
            }
        }

        await NewstourCommentsModel.deleteMany({ postId: _id });
        await NewstourLikesModel.deleteMany({ postId: _id })

        // ✅ delete post from DB
        await NewsAndTourModel.findByIdAndDelete(_id);


        // ✅ remove reference from EscortModel
        await EscortModel.updateOne(
            { escortId: post.escortId },
            { $pull: { newsTour: _id } }
        );

        return response.status(200).json({
            message: "Post deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {

        console.log("deleteNewsTourController error:", error);

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch All NewsTour posts by Country and city
export const fetchAllNewsTourController = async (request, response) => {
    try {

        const { country, city } = request.query;

        if (!country) {
            return response.status(400).json({
                message: "Country is required",
                success: false,
                error: true
            });
        }

        let query = {
            status: "active",
            country: country
        };

        // ✅ city filter only when provided
        if (city) {
            query.city = city;
        }

        const newsandtours = await NewsAndTourModel
            .find(query)
            .populate("userId", "name")
            .sort({ createdAt: -1 })
            .limit(24)
            .populate("newstourComments")
            .populate("newstourLikes");

        const formattedNewsandtours = newsandtours.map(newsandtour => ({
            ...newsandtour.toObject(),
            escortName: newsandtour.userId?.name
        }));


        return response.status(200).json({
            message: "Newsandtours fetched successfully",
            success: true,
            error: false,
            data: formattedNewsandtours
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch selected NewsTour by post Id
export const fetchSelectNewsTourController = async (request, response) => {
    try {

        const { _id } = request.query;

        console.log("request.query: ", request.query);

        if (!_id) {
            return response.status(400).json({
                message: "_id is required",
                success: false,
                error: true
            });
        }


        const post = await NewsAndTourModel.findById(_id)
            .populate("newstourLikes")
            .populate({
                path: "newstourComments",
                populate: {
                    path: "userId",
                    select: "name avatar"
                }
            });

        return response.status(200).json({
            message: "Post fetched successfully",
            success: true,
            error: false,
            data: post
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// Toggle NewsTour Like controller
export const toggleNewstourLikeController = async (request, response) => {
    try {

        const { postId, userId } = request.body;


        if (!userId) {
            return response.status(401).json({
                message: "User not register",
                success: false,
                error: true
            })
        }

        const existingLike = await NewstourLikesModel.findOne({
            postId,
            userId
        });


        if (existingLike) {

            await NewstourLikesModel.deleteOne({
                _id: existingLike._id
            });

            await NewsAndTourModel.updateOne(
                { _id: postId },
                { $pull: { newstourLikes: existingLike._id } }
            );

            return response.status(200).json({
                message: "Like removed",
                success: true,
                error: false
            });

        }

        const like = await NewstourLikesModel.create({
            postId,
            userId
        });


        await NewsAndTourModel.updateOne(
            { _id: postId },
            { $push: { newstourLikes: like._id } }
        );

        const postUpdated = await NewsAndTourModel.findOne({ _id: postId });
        const Client = await ClientModel.findOne({ clientId: userId });

        if (!postUpdated.userId) {
            console.error("❌ Notification skipped: No Escort found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: postUpdated?.userId,
                recipientModel: "Escort",
                senderId: Client?._id,
                senderModel: "Client",
                type: "NEW LIKE",
                title: "New Like on News and Tour",
                message: `${Client?.name} has like your news and tour. Click to view.`,
                link: `/escortnewstour/${postUpdated?._id}`
            });
        }

        response.status(201).json({
            message: "Post liked",
            success: true,
            error: false,
            like
        });

    } catch (error) {

        response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// add NewsandTour Comments
export const addNewstourCommentController = async (request, response) => {
    try {

        const { postId, userId, userType, comment } = request.body;

        if (!userId) {
            return response.status(401).json({
                message: "User not register",
                success: false,
                error: true
            });
        }

        if (!comment && !request.file) {
            return response.status(402).json({
                message: "please add comment or media",
                success: false,
                error: true
            });
        }

        let mediaData = null;

        // ================= MEDIA UPLOAD =================
        if (request.file) {

            const uploadResult = await uploadMediaCloudinary(
                request.file,
                "escort-app/newstour/comments"
            );

            mediaData = {
                url: uploadResult.secure_url,
                type: uploadResult.resource_type === "video" ? "video" : "image"
            };
        }

        // ================= CREATE COMMENT =================
        const newComment = await NewstourCommentsModel.create({
            postId,
            userId,
            userType,
            comment,
            media: mediaData ? [mediaData] : []
        });

        // ================= UPDATE POST =================
        await NewsAndTourModel.updateOne(
            { _id: postId },
            { $push: { newstourComments: newComment._id } }
        );

        const post = await NewsAndTourModel.findById(postId);

        const Client = await ClientModel.findOne({ userId });

        if (!post.userId) {
            console.error("❌ Notification skipped: No Escort found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: post.userId,
                recipientModel: "Escort",
                senderId: Client._id,
                senderModel: "Client",
                type: "NEW Comments",
                title: "New Comments on News and Tour",
                message: `${Client.name} has Comments your news and tour. Click to view.`,
                link: `/escortnewstour/${post._id}`
            });
        }

        return response.status(200).json({
            message: "Comment added",
            success: true,
            error: false,
            comment: newComment
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch selected news and tour comments
export const fetchSelectedNewsTourComments = async (request, response) => {
    try {
        const { postId } = request.query;

        if (!postId) {
            return response.status(400).json({
                message: "postId required...!",
                success: false,
                error: true,
            });
        }

        const postComments = await NewstourCommentsModel
            .find({ postId: postId })
            .sort({ createdAt: -1 })
            .populate({
                path: "userId",
                select: "name avatar"
            });

        return response.status(200).json({
            message: "Fetch comments",
            success: true,
            error: false,
            data: postComments
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true,
        });
    }
};


// ==============================================< Blog controlls >==============================================

// Create Blog
export const createBlog = async (request, response) => {
    let uploadedMedia = [];

    try {

        const { escortId, userId, userType, name, city, country, title, description } = request.body;

        if (!escortId || !title || !description) {
            return response.status(400).json({
                message: "escortId, title and description are required",
                success: false,
                error: true,
            });
        }

        // ✅ file validation
        if (!request.files || request.files.length === 0) {
            return response.status(400).json({
                message: "At least 1 media file required",
                success: false,
                error: true,
            });
        }

        if (request.files.length > 1) {
            return response.status(400).json({
                message: "Maximum 1 media files allowed",
                success: false,
                error: true,
            });
        }

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true,
            });
        }

        // ✅ upload media to cloudinary (with compression + validation)
        const mediaUploads = await Promise.all(
            request.files.map(async (file) => {

                // 🔴 TYPE VALIDATION
                if (!file.mimetype.startsWith("image") && !file.mimetype.startsWith("video")) {
                    throw new Error("Only image or video allowed");
                }

                // 🔴 VIDEO SIZE VALIDATION (no compression)
                if (file.mimetype.startsWith("video") && file.size > 10 * 1024 * 1024) {
                    throw new Error("Video must be under 10MB");
                }

                let fileBuffer = file.buffer;

                // ✅ IMAGE COMPRESSION (Sharp)
                if (file.mimetype.startsWith("image")) {

                    const compressedBuffer = await sharp(file.buffer)
                        .resize({ width: 1024 }) // max width
                        .jpeg({ quality: 70 })   // compression
                        .toBuffer();

                    fileBuffer = compressedBuffer;

                    // 🔴 FINAL SIZE CHECK
                    if (fileBuffer.length > 10 * 1024 * 1024) {
                        throw new Error("Compressed image still too large");
                    }
                }

                // ✅ upload
                const result = await uploadMediaCloudinary(
                    { ...file, buffer: fileBuffer },
                    "blog/post"
                );

                const mediaObj = {
                    url: result.secure_url,
                    public_id: result.public_id,
                    type: file.mimetype.startsWith("video") ? "video" : "image"
                };

                uploadedMedia.push(mediaObj);

                return mediaObj;
            })
        );

        const post = await BlogModel.create({
            escortId,
            userId,
            userType,
            city,
            country,
            name,
            title,
            description,
            status: "active",
            media: mediaUploads
        });

        await EscortModel.findOneAndUpdate(
            { escortId },
            { $push: { blog: post._id } }
        );

        const admin = await AdminModel.findOne();
        if (!admin) {
            console.error("❌ Notification skipped: No Admin found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: admin._id,
                recipientModel: "Admin",
                senderId: updatedEscort._id,
                senderModel: "Escort",
                type: "NEW BLOG",
                title: "New blog published",
                message: `${updatedEscort.name} has published a new blog. Click to review.`,
                link: `/dashboard/blog-moderation`
            });
        }

        return response.status(201).json({
            message: "Blog created successfully",
            success: true,
            error: false,
            data: post
        });

    } catch (error) {
        console.log("🔥 ERROR:", error);

        if (uploadedMedia.length > 0) {
            await Promise.all(
                uploadedMedia.map(item =>
                    cloudinary.uploader.destroy(item.public_id, {
                        resource_type: item.type === "video" ? "video" : "image"
                    })
                )
            );
        }



        return response.status(500).json({
            message: error.message || "Server Error",
            success: false,
            error: true
        });
    }
};

// update Blog
export const updateBlog = async (request, response) => {
    try {

        const { _id, title, description } = request.body;

        console.log("request.body: ", request.body);

        if (!_id) {
            return response.status(400).json({
                message: "Post _id required",
                success: false,
                error: true
            });
        }

        const post = await BlogModel.findById(_id);

        console.log("post: ", post);

        if (!post) {
            return response.status(404).json({
                message: "Post not found",
                success: false,
                error: true
            });
        }

        let mediaUploads = post.media;

        if (request.files && request.files?.length > 0) {

            if (request.files.length > 1) {
                return response.status(400).json({
                    message: "Maximum 1 media allowed",
                    success: false,
                    error: true
                });
            }

            // delete old media from cloudinary
            if (post.media && post.media?.length > 0) {
                for (let m of post.media) {

                    if (m.public_id) {
                        await cloudinary.uploader.destroy(
                            m.public_id,
                            {
                                resource_type: m.type === "video" ? "video" : "image"
                            }
                        );
                    }
                }
            }

            // upload new media
            mediaUploads = await Promise.all(
                request.files.map(async (file) => {

                    const result = await uploadMediaCloudinary(
                        file,
                        "blog/post"
                    );

                    return {
                        url: result.secure_url,
                        public_id: result.public_id,
                        type: result.resource_type || (
                            file.mimetype.startsWith("video")
                                ? "video"
                                : "image"
                        )
                    };
                })
            );
        }

        // update post
        const updatedPost = await BlogModel.findByIdAndUpdate(
            _id,
            {
                title: title || post.title,
                description: description || post.description,
                media: mediaUploads
            },
            { new: true }
        );

        return response.status(200).json({
            message: "Post updated successfully",
            success: true,
            error: false,
            data: updatedPost
        });

    } catch (error) {

        console.log("update blog error:", error);

        return response.status(500).json({
            message: error.message || "server error",
            success: false,
            error: true
        });

    }
};

// Delete blog
export const deleteBlog = async (request, response) => {
    try {

        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Post _id required",
                success: false,
                error: true
            });
        }

        const post = await BlogModel.findById(_id);

        if (!post) {
            return response.status(404).json({
                message: "Blog not found",
                success: false,
                error: true
            });
        }

        // ✅ Delete media from cloudinary
        if (post.media && post.media.length > 0) {

            for (let m of post.media) {

                if (m.public_id) {
                    await cloudinary.uploader.destroy(
                        m.public_id,
                        {
                            resource_type: m.type === "video" ? "video" : "image"
                        }
                    );
                }
            }
        }

        await BlogCommentsModel.deleteMany({ postId: _id });
        await BlogLikesModel.deleteMany({ postId: _id });

        // ✅ delete post from DB
        await BlogModel.findByIdAndDelete(_id);

        // ✅ remove reference from EscortModel
        await EscortModel.updateOne(
            { escortId: post.escortId },
            { $pull: { blog: _id } }
        );

        return response.status(200).json({
            message: "Post deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {

        console.log("deleteNewsTourController error:", error);

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// Block blog commnets 
export const blockBlogComments = async (request, response) => {
    try {

        const { _id, userId } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Blog _id required",
                success: false,
                error: true
            });
        }

        const blog = await BlogModel.findById(_id);

        if (!blog) {
            return response.status(404).json({
                message: "Blog not found",
                success: false,
                error: true
            });
        }

        // ✅ TOGGLE LOGIC
        blog.isCommentsBlocked = !blog.isCommentsBlocked;

        await blog.save();

        return response.status(200).json({
            message: blog.isCommentsBlocked
                ? "Comments blocked successfully"
                : "Comments unblocked successfully",
            success: true,
            error: false,
            data: blog
        });

    } catch (error) {

        console.log("deleteNewsTourController error:", error);

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch All Blog posts by Country and city
export const fetchAllBlogs = async (request, response) => {
    try {

        const { country, city } = request.query;

        if (!country) {
            return response.status(400).json({
                message: "Country is required",
                success: false,
                error: true
            });
        }

        let query = {
            status: "active",
            country: country
        };

        // ✅ city filter only when provided
        if (city) {
            query.city = city;
        }

        const posts = await BlogModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(24)
            .populate({
                path: "userId",
                select: "name avatar"
            })

        if (!posts.length) {
            return response.status(404).json({
                message: "blogs not available",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Blogs fetched successfully",
            success: true,
            error: false,
            data: posts
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch selected Blog by post Id
export const fetchSelectBlog = async (request, response) => {
    try {

        const { _id } = request.query;

        // check id exist
        if (!_id) {
            return response.status(400).json({
                message: "_id is required",
                success: false,
                error: true
            });
        }

        const post = await BlogModel
            .findById(_id)
            .populate({
                path: "blogLikes"
            })
            .populate({
                path: "blogComments"
            })
            .populate({
                path: "userId",
                select: "name avatar"
            });

        // check blog exist
        if (!post) {
            return response.status(404).json({
                message: "Blog not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Blog fetched successfully",
            success: true,
            error: false,
            data: post
        });

    } catch (error) {

        console.error("fetchSelectBlog error:", error);

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// fetch all blogs of escort
export const fetchEscortBlog = async (request, response) => {
    try {
        const { escortId } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "EscortId not found",
                success: false,
                error: true,
            });
        }

        const posts = await BlogModel
            .find({ escortId: escortId, status: "active" })
            .sort({ createdAt: -1 })
            .limit(15)
            .populate({
                path: "userId",
                select: "name avatar"
            })
            .populate({
                path: "blogComments"
            })
            .populate({
                path: "blogLikes"
            });

        return response.status(200).json({
            message: "Posts fetched successfully",
            success: true,
            error: false,
            data: posts
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server Error",
            success: false,
            error: true
        })
    }

}

// Toggle Blog Like controller
export const toggleBlogLike = async (request, response) => {
    try {

        const { postId, userId } = request.body;

        console.log("like request body : ", request.body);

        if (!userId) {
            return response.status(401).json({
                message: "User not register",
                success: false,
                error: true
            })
        }

        const existingLike = await BlogLikesModel.findOne({
            postId,
            userId
        });

        console.log("existingLike : ", existingLike);

        if (existingLike) {

            await BlogLikesModel.deleteOne({
                _id: existingLike._id
            });

            await BlogModel.updateOne(
                { _id: postId },
                { $pull: { blogLikes: existingLike._id } }
            );

            return response.status(200).json({
                message: "Like removed",
                success: true,
                error: false
            });

        }

        const like = await BlogLikesModel.create({
            postId,
            userId
        });

        console.log("Like : ", like);

        await BlogModel.updateOne(
            { _id: postId },
            { $push: { blogLikes: like._id } }
        );

        const post = await BlogModel.findById(postId);

        const Client = await ClientModel.findOne({ userId });

        if (!post.userId) {
            console.error("❌ Notification skipped: No Escort found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: post.userId,
                recipientModel: "Escort",
                senderId: Client._id,
                senderModel: "Client",
                type: "NEW LIKE",
                title: "New Like on blog",
                message: `${Client.name} has Like your blog. Click to view.`,
                link: `/blog`
            });
        }

        response.status(201).json({
            message: "Post liked",
            success: true,
            error: false,
            like
        });

    } catch (error) {
        console.log("like error: ", error);

        response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// add Blog Comments
export const addBlogComment = async (request, response) => {
    try {

        const { postId, userId, userType, comment } = request.body;

        if (!userId) {
            return response.status(401).json({
                message: "User not register",
                success: false,
                error: true
            });
        }

        if (!comment && !request.file) {
            return response.status(402).json({
                message: "please add comment or media",
                success: false,
                error: true
            });
        }

        let mediaData = null;

        // ================= MEDIA UPLOAD =================
        if (request.file) {

            const uploadResult = await uploadMediaCloudinary(
                request.file,
                "escort-app/blog/comments"
            );

            mediaData = {
                url: uploadResult.secure_url,
                type: uploadResult.resource_type === "video" ? "video" : "image"
            };
        }

        // ================= CREATE COMMENT =================
        const newComment = await BlogCommentsModel.create({
            postId,
            userId,
            userType,
            comment,
            media: mediaData ? [mediaData] : []
        });

        // ================= UPDATE POST =================
        await BlogModel.updateOne(
            { _id: postId },
            { $push: { blogComments: newComment._id } }
        );

        const post = await BlogModel.findById(postId);

        const Client = await ClientModel.findOne({ userId });

        if (!post.userId) {
            console.error("❌ Notification skipped: No Escort found in database.");
        } else {
            const load = await createAndSendNotification(request.app, {
                recipientId: post.userId,
                recipientModel: "Escort",
                senderId: Client._id,
                senderModel: "Client",
                type: "NEW COMMENTS",
                title: "New Comments on blog",
                message: `${Client.name} has Comments your blog. Click to view.`,
                link: `/blog`
            });
        }

        return response.status(200).json({
            message: "Comment added",
            success: true,
            error: false,
            comment: newComment
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};

// fetch selected Blog comments
export const fetchSelectedBlogComments = async (request, response) => {
    try {
        const { postId } = request.query;

        if (!postId) {
            return response.status(400).json({
                message: "postId required...!",
                success: false,
                error: true,
            });
        }

        const postComments = await BlogCommentsModel
            .find({ postId: postId })
            .sort({ createdAt: -1 })
            .populate({
                path: "userId",
                select: "name avatar"
            });

        return response.status(200).json({
            message: "Fetch comments",
            success: true,
            error: false,
            data: postComments
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true,
        });
    }
};

// =======================================================< Add Bookings and Availability >==========================================================================================================

// add booking
export const addBooking = async (request, response) => {

    try {

        const {
            userId,
            escortId,

            date,

            startTime,
            endTime,

            isAllDay,
            notAvailable,

            status,
            title,

            type, // booking | availability

            availabilityMode, // single | multiple | weekly

            repeatWeekly,

            weekDays = []

        } = request.body;

        // =========================================
        // VALIDATION
        // =========================================

        if (!userId || !escortId || !type) {

            return response.status(400).json({

                message: "Required fields missing",
                success: false,
                error: true

            });

        }

        // =========================================
        // DATE VALIDATION
        // =========================================

        if (
            (availabilityMode === "single" ||
                type === "booking") &&
            !date
        ) {

            return response.status(400).json({

                message: "Date is required",
                success: false,
                error: true

            });

        }

        // =========================================
        // WEEK DAYS VALIDATION
        // =========================================

        if (
            (availabilityMode === "multiple" ||
                availabilityMode === "weekly") &&
            weekDays.length === 0
        ) {

            return response.status(400).json({

                message: "Please select week days",
                success: false,
                error: true

            });

        }

        // =========================================
        // SAME TIME VALIDATION
        // =========================================

        if (
            !isAllDay &&
            !notAvailable &&
            startTime === endTime
        ) {

            return response.status(400).json({

                message:
                    "Start and end time cannot be same",

                success: false,
                error: true

            });

        }

        // =========================================
        // TIME SETUP
        // =========================================

        let start = startTime;
        let end = endTime;

        if (isAllDay || notAvailable) {

            start = "00:00";
            end = "23:59";

        }

        // =========================================
        // DAYS MAP
        // =========================================

        const daysMap = {

            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6

        };

        // =========================================
        // GET NEXT DATE BY DAY
        // =========================================

        const getNextDateByDay = (targetDay) => {

            const today = new Date();

            const currentDay =
                today.getDay();

            const targetDayIndex =
                daysMap[targetDay];

            let diff =
                targetDayIndex - currentDay;

            // passed day => next week
            if (diff < 0) {

                diff += 7;

            }

            const nextDate =
                new Date(today);

            nextDate.setDate(
                today.getDate() + diff
            );

            return nextDate
                .toISOString()
                .split("T")[0];

        };

        // =========================================
        // CONFLICT CHECK
        // =========================================

        const checkConflict = async (
            selectedDate,
            start,
            end,
            type
        ) => {

            let startDateTime =
                new Date(
                    `${selectedDate}T${start}:00`
                );

            let endDateTime =
                new Date(
                    `${selectedDate}T${end}:00`
                );

            // =====================================
            // OVERNIGHT SUPPORT
            // =====================================

            if (
                endDateTime <= startDateTime
            ) {

                endDateTime.setDate(
                    endDateTime.getDate() + 1
                );

            }

            // =====================================
            // GET EXISTING SLOTS
            // =====================================

            const existingSlots =
                await BookingModel.find({

                    escortId,
                    date: selectedDate

                });

            // =====================================
            // LOOP
            // =====================================

            for (const slot of existingSlots) {

                let slotStart =
                    new Date(
                        `${slot.date}T${slot.startTime}:00`
                    );

                let slotEnd =
                    new Date(
                        `${slot.date}T${slot.endTime}:00`
                    );

                // overnight existing slot
                if (
                    slotEnd <= slotStart
                ) {

                    slotEnd.setDate(
                        slotEnd.getDate() + 1
                    );

                }

                // =================================
                // OVERLAP CHECK
                // =================================

                const overlap =

                    startDateTime < slotEnd &&
                    endDateTime > slotStart;

                if (!overlap) continue;

                // =================================
                // FULL DAY BLOCK
                // =================================

                if (
                    slot.notAvailable
                ) {

                    return true;

                }

                // =================================
                // BOOKING RULES
                // =================================

                if (type === "booking") {

                    // booking vs booking
                    if (
                        slot.type === "booking"
                    ) {

                        return true;

                    }

                    // booking inside availability allowed
                    if (
                        slot.type === "availability"
                    ) {

                        continue;

                    }

                }

                // =================================
                // AVAILABILITY RULES
                // =================================

                if (
                    type === "availability"
                ) {

                    // availability can NEVER overlap booking
                    if (
                        slot.type === "booking"
                    ) {

                        return true;

                    }

                    // availability overlap availability
                    if (
                        slot.type === "availability"
                    ) {

                        return true;

                    }

                }

            }

            return false;

        };

        // =========================================
        // CREATE RECORD
        // =========================================

        const createRecord = async (
            selectedDate
        ) => {

            const hasConflict =
                await checkConflict(
                    selectedDate,
                    start,
                    end,
                    type
                );

            if (hasConflict) {

                return null;

            }

            const booking =
                await BookingModel.create({

                    userId,
                    escortId,

                    date: selectedDate,

                    startTime: start,
                    endTime: end,

                    isAllDay,
                    notAvailable,

                    status:
                        status || "active",

                    title,

                    type,

                    availabilityMode,

                    repeatWeekly,

                    weekDays

                });

            // =====================================
            // PUSH INTO ESCORT
            // =====================================

            await EscortModel.findOneAndUpdate(

                { escortId },

                {

                    $push: {
                        bookings: booking._id
                    }

                }

            );

            return booking;

        };

        // =========================================
        // MAIN LOGIC
        // =========================================

        let createdRecords = [];

        // =========================================
        // SINGLE
        // =========================================

        if (
            availabilityMode === "single" ||
            type === "booking"
        ) {

            const booking =
                await createRecord(date);

            if (!booking) {

                return response
                    .status(400)
                    .json({

                        message:
                            type === "booking"
                                ? "Time slot already booked"
                                : "Availability conflicts with booking",

                        success: false,
                        error: true

                    });

            }

            createdRecords.push(
                booking
            );

        }

        // =========================================
        // MULTIPLE
        // =========================================

        else if (
            availabilityMode === "multiple"
        ) {

            for (const day of weekDays) {

                const calculatedDate =
                    getNextDateByDay(day);

                const booking =
                    await createRecord(
                        calculatedDate
                    );

                if (booking) {

                    createdRecords.push(
                        booking
                    );

                }

            }

        }

        // =========================================
        // WEEKLY
        // =========================================

        else if (
            availabilityMode === "weekly"
        ) {

            const today =
                new Date();

            const currentDay =
                today.getDay();

            for (const day of weekDays) {

                const dayIndex =
                    daysMap[day];

                // current week remaining days only
                if (
                    dayIndex >= currentDay
                ) {

                    const calculatedDate =
                        getNextDateByDay(day);

                    const booking =
                        await createRecord(
                            calculatedDate
                        );

                    if (booking) {

                        createdRecords.push(
                            booking
                        );

                    }

                }

            }

        }

        // =========================================
        // SUCCESS
        // =========================================

        return response.status(201).json({

            message:
                type === "booking"
                    ? "Booking added successfully"
                    : "Availability added successfully",

            success: true,
            error: false,

            totalCreated:
                createdRecords.length,

            data: createdRecords

        });

    } catch (error) {

        console.log(
            "create booking error",
            error
        );

        return response.status(500).json({

            message:
                error.message ||
                "Server error",

            success: false,
            error: true

        });

    }

};


// fetch booking
export const fetchBookings = async (request, response) => {
    try {

        const { escortId, date } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId is required",
                success: false,
                error: true
            });
        }

        // ✅ Filter (date optional hai)
        let query = { escortId };

        if (date) {
            query.date = date;
        }

        const bookings = await BookingModel.find(query)
            .sort({ date: 1, startTime: 1 });

        return response.status(200).json({
            message: "Bookings fetched successfully",
            success: true,
            error: false,
            data: bookings
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// update booking 
export const updateBooking = async (
    request,
    response
) => {

    try {

        const {

            _id,

            date,

            startTime,
            endTime,

            isAllDay,
            notAvailable,

            status,
            title,

            type,

            availabilityMode,

            repeatWeekly,

            weekDays = []

        } = request.body;

        // =========================================
        // VALIDATION
        // =========================================

        if (!_id) {

            return response.status(400).json({

                message:
                    "Booking ID is required",

                success: false,
                error: true

            });

        }

        // =========================================
        // FIND BOOKING
        // =========================================

        const booking =
            await BookingModel.findById(_id);

        if (!booking) {

            return response.status(404).json({

                message:
                    "Booking not found",

                success: false,
                error: true

            });

        }

        // =========================================
        // DATE VALIDATION
        // =========================================

        if (
            (availabilityMode === "single" ||
                type === "booking") &&
            !date
        ) {

            return response.status(400).json({

                message:
                    "Date is required",

                success: false,
                error: true

            });

        }

        // =========================================
        // WEEK DAYS VALIDATION
        // =========================================

        if (
            (availabilityMode === "multiple" ||
                availabilityMode === "weekly") &&
            weekDays.length === 0
        ) {

            return response.status(400).json({

                message:
                    "Please select week days",

                success: false,
                error: true

            });

        }

        // =========================================
        // SAME TIME VALIDATION
        // =========================================

        if (
            !isAllDay &&
            !notAvailable &&
            startTime === endTime
        ) {

            return response.status(400).json({

                message:
                    "Start and end time cannot be same",

                success: false,
                error: true

            });

        }

        // =========================================
        // TIME SETUP
        // =========================================

        let start =
            startTime || booking.startTime;

        let end =
            endTime || booking.endTime;

        if (
            isAllDay ||
            notAvailable
        ) {

            start = "00:00";
            end = "23:59";

        }

        // =========================================
        // DATE SETUP
        // =========================================

        const selectedDate =
            date || booking.date;

        // =========================================
        // CREATE DATE OBJECTS
        // =========================================

        let startDateTime =
            new Date(
                `${selectedDate}T${start}:00`
            );

        let endDateTime =
            new Date(
                `${selectedDate}T${end}:00`
            );

        // =========================================
        // OVERNIGHT SUPPORT
        // =========================================

        if (
            endDateTime <= startDateTime
        ) {

            endDateTime.setDate(
                endDateTime.getDate() + 1
            );

        }

        // =========================================
        // GET EXISTING BOOKINGS
        // =========================================

        const existingSlots =
            await BookingModel.find({

                escortId:
                    booking.escortId,

                date: selectedDate,

                _id: {
                    $ne: _id
                }

            });

        // =========================================
        // CONFLICT CHECK
        // =========================================

        for (const slot of existingSlots) {

            let slotStart =
                new Date(
                    `${slot.date}T${slot.startTime}:00`
                );

            let slotEnd =
                new Date(
                    `${slot.date}T${slot.endTime}:00`
                );

            // overnight existing slot
            if (
                slotEnd <= slotStart
            ) {

                slotEnd.setDate(
                    slotEnd.getDate() + 1
                );

            }

            // =====================================
            // OVERLAP CHECK
            // =====================================

            const overlap =

                startDateTime < slotEnd &&
                endDateTime > slotStart;

            if (!overlap) continue;

            // =====================================
            // FULL DAY BLOCK
            // =====================================

            if (
                slot.notAvailable
            ) {

                return response.status(400).json({

                    message:
                        "This date is marked unavailable",

                    success: false,
                    error: true

                });

            }

            // =====================================
            // BOOKING RULES
            // =====================================

            if (
                type === "booking"
            ) {

                // booking vs booking
                if (
                    slot.type === "booking"
                ) {

                    return response.status(400).json({

                        message:
                            "Time slot already booked",

                        success: false,
                        error: true

                    });

                }

                // booking inside availability allowed
                if (
                    slot.type === "availability"
                ) {

                    continue;

                }

            }

            // =====================================
            // AVAILABILITY RULES
            // =====================================

            if (
                type === "availability"
            ) {

                // availability can NEVER overlap booking
                if (
                    slot.type === "booking"
                ) {

                    return response.status(400).json({

                        message:
                            "Availability conflicts with booking",

                        success: false,
                        error: true

                    });

                }

                // availability overlap availability
                if (
                    slot.type === "availability"
                ) {

                    return response.status(400).json({

                        message:
                            "Availability already exists in this time slot",

                        success: false,
                        error: true

                    });

                }

            }

        }

        // =========================================
        // UPDATE FIELDS
        // =========================================

        booking.date =
            selectedDate;

        booking.startTime =
            start;

        booking.endTime =
            end;

        booking.isAllDay =
            isAllDay ??
            booking.isAllDay;

        booking.notAvailable =
            notAvailable ??
            booking.notAvailable;

        booking.status =
            status ||
            booking.status;

        booking.title =
            title || "";

        booking.type =
            type ||
            booking.type;

        booking.availabilityMode =
            availabilityMode ||
            booking.availabilityMode;

        booking.repeatWeekly =
            repeatWeekly ??
            booking.repeatWeekly;

        booking.weekDays =
            weekDays;

        // =========================================
        // SAVE
        // =========================================

        await booking.save();

        // =========================================
        // SUCCESS
        // =========================================

        return response.status(200).json({

            message:
                type === "booking"
                    ? "Booking updated successfully"
                    : "Availability updated successfully",

            success: true,
            error: false,

            data: booking

        });

    } catch (error) {

        console.log(
            "update booking error",
            error
        );

        return response.status(500).json({

            message:
                error.message ||
                "Server error",

            success: false,
            error: true

        });

    }

};

// Delete booking
export const deleteBooking = async (request, response) => {
    try {

        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Booking ID is required",
                success: false,
                error: true
            });
        }

        const booking = await BookingModel.findByIdAndDelete(_id);

        if (!booking) {
            return response.status(404).json({
                message: "Booking not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Booking deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// fetch select booking details
export const fetchSelectBooking = async (request, response) => {
    try {

        const { _id } = request.query;

        if (!_id) {
            return response.status(400).json({
                message: "Booking ID is required",
                success: false,
                error: true
            });
        }

        const booking = await BookingModel.findById(_id);

        if (!booking) {
            return response.status(404).json({
                message: "Booking not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Booking fetched successfully",
            success: true,
            error: false,
            data: booking
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// cancel booking / availability
export const cancelBooking = async (request, response) => {
    try {

        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Booking ID is required",
                success: false,
                error: true
            });
        }

        const booking = await BookingModel.findByIdAndUpdate(
            _id,
            { status: "cancel" },
            { new: true }
        );

        return response.status(200).json({
            message: "Booking updated successfully",
            success: true,
            error: false,
            data: booking
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// change status => complete 
export const complteBooking = async (request, response) => {
    try {

        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Booking ID is required",
                success: false,
                error: true
            });
        }

        const booking = await BookingModel.findByIdAndUpdate(
            _id,
            { status: "completed" },
            { new: true }
        );

        return response.status(200).json({
            message: "Booking updated successfully",
            success: true,
            error: false,
            data: booking
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });
    }
};

// ==========================================< Add , Fetch, update, and delete Tour  >=====================================================================

// add tour
export const addTour = async (request, response) => {
    try {
        const { escortId, userId, city, startDate, endDate, tourNotes } = request.body;

        // 🔴 Required validation
        if (!escortId || !city || !startDate || !endDate) {
            return response.status(400).json({
                message: "EscortId, City, Start Date and End Date are required",
                success: false,
                error: true
            });
        }

        // 🔴 Convert to Date (IMPORTANT)
        const start = new Date(startDate);
        const end = new Date(endDate);

        // 🔴 Date validation
        if (start > end) {
            return response.status(400).json({
                message: "Start date cannot be after end date",
                success: false,
                error: true
            });
        }

        const getTourStatus = (start, end) => {
            const today = new Date();

            // 🔴 Clone dates (important)
            const s = new Date(start);
            const e = new Date(end);
            const t = new Date(today);

            s.setHours(0, 0, 0, 0);
            e.setHours(0, 0, 0, 0);
            t.setHours(0, 0, 0, 0);

            if (s <= t && e >= t) return "ongoing";
            if (e < t) return "completed";
            return "upcoming";
        };

        const status = getTourStatus(start, end);

        // 🔥 Overlapping check (escort-wise)
        const existingTour = await TourModel.findOne({
            escortId: escortId,
            status: { $ne: "cancelled" },
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start },
                },
            ],
        });

        if (existingTour) {
            return response.status(400).json({
                message: "Tour dates overlap with existing tour",
                success: false,
                error: true
            });
        }

        // ✅ Create new tour
        const newTour = new TourModel({
            escortId,
            userId,
            city,
            startDate: start,
            endDate: end,
            tourNotes,
            status
        });

        const savedTour = await newTour.save();

        const updatedEscort = await EscortModel.findOneAndUpdate(
            { escortId: escortId },
            {
                $push: {
                    tours: savedTour._id
                }
            },
            { new: true }
        );

        return response.status(201).json({
            message: "Tour added successfully",
            success: true,
            error: false,
            data: savedTour,
        });

    } catch (error) {
        console.error("Add Tour Error:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        });
    }
};

// fetching tour by date and status
export const getToursByDate = async (request, response) => {
    try {
        const { escortId, startDate, endDate, status } = request.query;

        if (!escortId || !startDate || !endDate) {
            return response.status(400).json({
                message: "escortId and date are required",
                success: false,
                error: true,
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        let query = {
            escortId,
            startDate: { $lte: end },
            endDate: { $gte: start },
        };

        if (status && status !== "all") {
            query.status = status;
        }

        const tours = await TourModel.find(query);

        return response.status(200).json({
            message: "Tours fetched for selected date",
            success: true,
            error: false,
            count: tours.length,
            data: tours,
        });

    } catch (error) {
        console.error("Get Tours By Date Error:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        });
    }
};

// update tour
export const updateTour = async (request, response) => {
    try {
        const { escortId, _id, city, startDate, endDate, tourNotes } = request.body;

        // 🔴 Check tourId
        if (!_id) {
            return response.status(400).json({
                message: "TourId is required",
                success: false,
                error: true,
            });
        }

        // 🔍 Existing tour check
        const existingTour = await TourModel.findById(_id);

        if (!existingTour) {
            return response.status(404).json({
                message: "Tour not found",
                success: false,
                error: true,
            });
        }

        // 🔴 Convert dates if provided
        const start = startDate ? new Date(startDate) : existingTour.startDate;
        const end = endDate ? new Date(endDate) : existingTour.endDate;

        // ❗ Invalid date check
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return response.status(400).json({
                message: "Invalid date format",
                success: false,
                error: true,
            });
        }

        // 🔴 Date validation
        if (start > end) {
            return response.status(400).json({
                message: "Start date cannot be after end date",
                success: false,
                error: true,
            });
        }

        // 🔥 Overlap check (exclude current tour)
        const overlapTour = await TourModel.findOne({
            escortId: escortId || existingTour.escortId,
            _id: { $ne: _id }, // ❗ exclude current
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start },
                },
            ],
        });

        if (overlapTour) {
            return response.status(400).json({
                message: "Updated dates overlap with another tour",
                success: false,
                error: true,
            });
        }

        // ✅ Update fields
        existingTour.city = city || existingTour.city;
        existingTour.startDate = start;
        existingTour.endDate = end;
        existingTour.tourNotes = tourNotes ?? existingTour.tourNotes;
        existingTour.escortId = escortId || existingTour.escortId;

        const updatedTour = await existingTour.save();

        return response.status(200).json({
            message: "Tour updated successfully",
            success: true,
            error: false,
            data: updatedTour,
        });

    } catch (error) {
        console.error("Update Tour Error:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        });
    }
};

// delete tour
export const deleteTour = async (request, response) => {
    try {
        const { _id, userId } = request.body;

        // 🔴 Check tourId
        if (!_id) {
            return response.status(400).json({
                message: "TourId is required",
                success: false,
                error: true,
            });
        }

        // 🔍 Check if tour exists
        const existingTour = await TourModel.findById(_id);

        if (!existingTour) {
            return response.status(404).json({
                message: "Tour not found",
                success: false,
                error: true,
            });
        }

        // 🔐 Optional: Ownership check (VERY IMPORTANT)
        if (existingTour.userId.toString() !== userId) {
            return response.status(403).json({
                message: "Unauthorized to delete this tour",
                success: false,
                error: true,
            });
        }

        // ❗ Optional: Prevent delete if active
        const today = new Date();
        if (existingTour.startDate <= today && existingTour.endDate >= today) {
            return response.status(400).json({
                message: "Cannot delete an ongoing tour",
                success: false,
                error: true,
            });
        }

        // ✅ Delete
        await TourModel.findByIdAndDelete(_id);

        return response.status(200).json({
            message: "Tour deleted successfully",
            success: true,
            error: false,
        });

    } catch (error) {
        console.error("Delete Tour Error:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        });
    }
};

// cancel tour
export const cancelTour = async (request, response) => {
    try {
        const { _id, userId } = request.body;

        // 🔴 validation
        if (!_id) {
            return response.status(400).json({
                message: "TourId is required",
                success: false,
                error: true,
            });
        }

        // 🔍 find tour
        const existingTour = await TourModel.findById(_id);

        if (!existingTour) {
            return response.status(404).json({
                message: "Tour not found",
                success: false,
                error: true,
            });
        }

        // 🔐 ownership check
        if (existingTour.userId.toString() !== userId) {
            return response.status(403).json({
                message: "Unauthorized to cancel this tour",
                success: false,
                error: true,
            });
        }

        // ❗ already cancelled check
        if (existingTour.status === "cancelled") {
            return response.status(400).json({
                message: "Tour is already Cancelled",
                success: false,
                error: true,
            });
        }

        // ✅ update status
        existingTour.status = "cancelled";

        const updatedTour = await existingTour.save();

        return response.status(200).json({
            message: "Tour cancelled successfully",
            success: true,
            error: false,
            data: updatedTour,
        });

    } catch (error) {
        console.error("Cancel Tour Error:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        });
    }
};

// ==========================================================< Fetch Home Slider Escorts >====================================================================

// country escorts for home page banner
export async function fetchHomeSliderEscorts(request, response) {
    try {
        const { role, isVerified, country, city, isVisible } = request.query;

        let filter = {};

        if (role) filter.role = role;

        if (!country) {
            return response.status(400).json({
                message: "country is missing",
                error: true,
                success: false
            });
        }
        filter.country = country;

        if (isVerified !== undefined)
            filter.isVerified = isVerified === "true";

        if (isVisible !== undefined)
            filter.isVisible = isVisible === "true";

        // Only escorts with avatar
        filter.avatar = { $exists: true, $ne: null, $ne: "" };

        // City filter only if city is provided
        if (city) filter.city = city;

        console.log("request filter: ", filter);

        const escorts = await EscortModel.find(filter);

        return response.status(200).json({
            message: "Escort list fetched",
            error: false,
            success: true,
            data: escorts
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// city escorts for banner slider
export async function fetchCitySliderEscorts(request, response) {
    try {
        const { role, isVerified, city, country, isVisible } = request.query;

        let filter = {};

        if (role) filter.role = role;

        // if (!city) {
        //     return response.status(400).json({
        //         message: "city is missing",
        //         error: true,
        //         success: false
        //     });
        // }


        if (city) filter.city = city;
        filter.country = country;

        if (isVerified !== undefined)
            filter.isVerified = isVerified === "true";

        if (isVisible !== undefined)
            filter.isVisible = isVisible === "true";

        // Only escorts with avatar
        filter.avatar = { $exists: true, $ne: null, $ne: "" };

        const escorts = await EscortModel.find(filter);

        return response.status(200).json({
            message: "Escort list fetched",
            error: false,
            success: true,
            data: escorts
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// ===========================================< Get Escort Contact >=====================================================

export const getEscortContact = async (request, response) => {
    try {
        const { _id, type } = request.body;

        const escort = await EscortModel.findById(_id);

        if (!escort || !escort.mobile) {
            return response.status(404).json({
                message: "Contact not available",
                success: false,
                error: true
            });
        }

        if (escort.displayContact === false) {
            return response.status(403).json({
                message: "This escort has disabled contact access",
                success: false,
                error: true
            });
        }

        let mobile = escort.mobile;
        let countryCode = escort.countryCode || "";

        try {
            if (mobile.startsWith("enc:")) {
                mobile = decrypt(mobile.replace("enc:", ""));
            } else {
                mobile = decrypt(mobile); // fallback
            }
        } catch {
            return response.status(500).json({
                message: "Invalid mobile data",
                success: false,
                error: true
            });
        }

        let link = "";

        if (type === "sms") {
            let mobileNumber = mobile.replace(/\D/g, "");

            mobileNumber = countryCode + mobileNumber;

            link = `sms:+${mobileNumber}`;
        }

        if (type === "call") {
            let mobileNumber = mobile.replace(/\D/g, "");

            mobileNumber = countryCode + mobileNumber;

            link = `tel:+${mobileNumber}`;
        }



        if (type === "whatsapp") {
            let mobileNumber = mobile.replace(/\D/g, "");

            // ⚠️ TEMP FIX (default code)
            mobileNumber = countryCode + mobileNumber;

            link = `https://wa.me/${mobileNumber}`;
        }


        return response.json({
            message: "fetched success",
            success: true,
            error: false,
            link,

        });

    } catch (error) {
        return response.status(500).json({
            message: "Server error",
            success: false,
            error: true
        });
    }
};

// ===========================================================<Escort profile :  update , edit , hide , delete >==========================================================================================

// edit and update escort account details 
export async function updateEscortProfile(request, response) {
    try {
        const { _id, name, onlineStatus, contactVisible, muteNotifications } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "User id required",
                success: false,
                error: true
            });
        }

        // ✅ only defined fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (onlineStatus !== undefined) updateData.onlineStatus = onlineStatus;
        if (contactVisible !== undefined) updateData.contactVisible = contactVisible;
        if (muteNotifications !== undefined) updateData.muteNotifications = muteNotifications;

        const updatedEscort = await EscortModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Profile updated successfully",
            success: true,
            error: false,
            data: updatedEscort
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
}

// Hide un hide escort profile
export async function hideEscortProfile(request, response) {
    try {
        const { _id, isVisible } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "User id required",
                success: false,
                error: true
            });
        }

        const updatedEscort = await EscortModel.findByIdAndUpdate(
            _id,
            { $set: { isVisible: isVisible } }, // ✅ dynamic value
            { new: true }
        );

        if (!updatedEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: `Profile ${isVisible ? "visible" : "hidden"} successfully`,
            success: true,
            error: false,
            data: updatedEscort
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
}

//  permanent delete escort profile
export async function deleteEscortProfile(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "User id required",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findById(_id);

        if (!escort) {
            return response.status(400).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        // ✅ delete escort

        await BlogModel.deleteMany({ userId: _id });
        await ServiceModel.deleteMany({ userId: _id });
        await RatesModel.deleteMany({ userId: _id });
        await NewsAndTourModel.deleteMany({ userId: _id });
        await TourModel.deleteMany({ userId: _id });
        await BookingModel.deleteMany({ userId: _id });

        await NotificationModel.deleteMany({
            $or: [
                {
                    recipient: escort._id,
                    recipientModel: "Escort"
                },
                {
                    sender: escort._id,
                    senderModel: "Escort"
                }
            ]
        });

        const deletedEscort = await EscortModel.findByIdAndDelete(_id);

        return response.status(200).json({
            message: "Escort profile and related data deleted",
            success: true,
            error: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

//  edit escort profile details 
export async function editEscortProfileDetails(request, response) {
    try {
        const {
            _id,
            name,
            landline,
            website,
            social,
            age,
            height,
            gender,
            sexuality,
            eyeColor,
            bustSize,
            hairColor,
            hairStyle,
            dressSize,
            ethnicity,
            speakingLanguage,
            preferData,
            about,
            country,
            city
        } = request.body;

        // ✅ REQUIRED CHECK
        if (!_id) {
            return response.status(400).json({
                message: "User id required",
                success: false,
                error: true
            });
        }

        // ✅ PREPARE UPDATE OBJECT (ONLY VALID DATA)
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (landline !== undefined) updateData.landline = landline;
        if (website !== undefined) updateData.website = website;
        if (social !== undefined) updateData.social = social;

        if (age !== undefined) updateData.age = Number(age); // 🔥 number safe
        if (height !== undefined) updateData.height = height;

        if (gender !== undefined) updateData.gender = gender;
        if (sexuality !== undefined) updateData.sexuality = sexuality;

        if (eyeColor !== undefined) updateData.eyeColor = eyeColor;
        if (bustSize !== undefined) updateData.bustSize = bustSize;

        if (hairColor !== undefined) updateData.hairColor = hairColor;
        if (hairStyle !== undefined) updateData.hairStyle = hairStyle;

        if (dressSize !== undefined) updateData.dressSize = dressSize;
        if (ethnicity !== undefined) updateData.ethnicity = ethnicity;

        if (Array.isArray(speakingLanguage)) updateData.speakingLanguage = speakingLanguage; // 🔥 safe
        if (Array.isArray(preferData)) updateData.preferData = preferData;

        if (about !== undefined) updateData.about = about;

        if (country !== undefined) updateData.country = country;
        if (city !== undefined) updateData.city = city;

        // ✅ UPDATE USER
        const updatedEscort = await EscortModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Profile updated successfully",
            success: true,
            error: false,
            data: updatedEscort
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}


