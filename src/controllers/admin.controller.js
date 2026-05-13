import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";
import AdminModel from "../models/adminModel.js";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import { sendMail } from "../utils/sendMail.js";
import TourModel from '../models/tourModel.js';
import BlogModel from '../models/blogModel.js';
import BlogCommentsModel from '../models/blogCommentsModel.js';
import BlogLikesModel from '../models/blogLikesModel.js';
import cloudinary from '../config/cloudinary.js';
import NewsAndTourModel from '../models/newsandtourModel.js';
import NewstourCommentsModel from '../models/newstourCommentsModel.js';
import NewstourLikesModel from '../models/newstourLikesModel.js';
import { decrypt } from '../utils/crypto.js';

// Admin login
export async function adminlogincontroller(request, response) {
    try {
        const { username, password } = request.body;

        if (!username || !password) {
            return response.status(400).json({
                message: "Username or Password required",
                success: false,
                error: true
            })
        }
        const admin = await AdminModel.findOne({ username }).select("+password");

        if (!admin) {
            return response.status(401).json({
                message: "Unauthorised access",
                success: false,
                error: true
            })
        }

        if (admin.role !== "Admin") {
            return response.status(403).json({
                message: "Access denied",
                success: false,
                error: true
            });
        }

        const checkPassword = await bcryptjs.compare(password, admin.password)
        if (!checkPassword) {
            return response.status(401).json({
                message: "check your password",
                success: false,
                error: true
            })
        }

        const token = jwt.sign(
            {
                _id: admin._id,
                role: admin.role || "Admin"
            },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );

        response.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        return response.json({
            message: "Login successful",
            success: true,
            error: false,
            data: {
                token: token,
                admin: {
                    _id: admin._id,
                    username: admin.username,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        })
    }
}

// logout controll
export async function adminlogoutcontroller(request, response) {
    try {
        const adminId = request.user?._id;

        if (!adminId) {
            return response.status(401).json({
                message: "Unauthorized",
                success: false,
                error: true
            });
        }

        const admin = await AdminModel.findById(adminId);

        if (!admin) {
            return response.status(404).json({
                message: "Admin not found",
                success: false,
                error: true
            });
        }

        await AdminModel.findByIdAndUpdate(adminId, {
            $set: {
                onlineStatus: false,
                refresh_token: ""
            }
        });

        response.clearCookie("token");

        return response.status(200).json({
            message: "Logged out successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.log("LOGOUT ERROR FULL:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

// fetch account details
export const getAdminDetails = async (request, response) => {
    try {
        // 👉 JWT middleware
        const adminId = request.user?._id;

        console.log("admin token", adminId);

        if (!adminId) {
            return response.status(401).json({
                message: "Unauthorized access",
                success: false,
                error: true,
            });
        }

        const admin = await AdminModel
            .findById(adminId)
            .select("-password -__v");

        if (!admin) {
            return response.status(404).json({
                message: "Admin not found",
                success: false,
                error: true,
            });
        }

        return response.status(200).json({
            message: "Admin fetched successfully",
            success: true,
            error: false,
            data: admin,
        });

    } catch (error) {
        console.log("admin fetch error:", error);

        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};

// name update
export const updateAdminName = async (request, response) => {
    try {
        const { name } = request.body;

        // ❗ Validation
        if (!name || name.trim() === "") {
            return response.status(400).json({
                message: "Name is required",
                success: false,
                error: true,
            });
        }

        // 👉 JWT use
        const adminId = request.user?._id;

        const updatedAdmin = await AdminModel.findByIdAndUpdate(
            adminId,
            { $set: { name: name.trim() } },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedAdmin) {
            return response.status(404).json({
                message: "Admin not found",
                success: false,
                error: true,
            });
        }

        return response.status(200).json({
            message: "Name updated successfully",
            success: true,
            error: false,
            data: updatedAdmin,
        });

    } catch (error) {
        console.log("update name error:", error);
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true,
        });
    }
};


export const changePassword = async (request, response) => {
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
        const user = await AdminModel.findById(userId).select("+password");

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

        await AdminModel.findByIdAndUpdate(userId, {
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

// forgot passwor send otp
export const forgotPassword = async (request, response) => {
    try {
        const { email } = request.body;

        if (!email) {
            return response.status(400).json({
                message: "Email is required",
                success: false,
                error: true
            });
        }

        const admin = await AdminModel.findOne({ email });

        if (!admin) {
            return response.status(200).json({
                message: "If account exists, OTP sent",
                success: true,
                error: false
            });
        }

        // cooldown check (30 sec)
        if (admin.otpResendTime && admin.otpResendTime > Date.now()) {
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

        const updated = await AdminModel.findOneAndUpdate(
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

            await AdminModel.findByIdAndUpdate(admin._id, {
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
            message: "OTP sent",
            success: true,
            error: false
        });

    } catch (error) {
        console.error(error);

        return response.status(500).json({
            message: "Something went wrong",
            success: false,
            error: true
        });
    }
};

// verify otp
export const verifyOtp = async (request, response) => {
    try {
        const { email, otp } = request.body;

        // 1. validation
        if (!email || !otp) {
            return response.status(400).json({
                success: false,
                message: "Email and OTP required"
            });
        }

        // 2. find admin
        const admin = await AdminModel.findOne({ email });

        if (!admin || !admin.resetOtp) {
            return response.status(400).json({
                success: false,
                message: "Invalid request"
            });
        }

        // 3. expiry check (safe)
        if (!admin.otpExpiry || admin.otpExpiry < Date.now()) {
            return response.status(400).json({
                success: false,
                message: "OTP expired"
            });
        }

        // 4. attempts limit check
        if (admin.otpAttempts >= 5) {
            return response.status(429).json({
                success: false,
                message: "Too many attempts. Try again later"
            });
        }

        // 5. OTP match
        const isMatch = await bcryptjs.compare(otp, admin.resetOtp);

        // ❌ WRONG OTP
        if (!isMatch) {
            await AdminModel.updateOne(
                { email },
                { $inc: { otpAttempts: 1 } }
            );

            return response.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // 6. SUCCESS → clear OTP (NO save used)
        await AdminModel.updateOne(
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
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return response.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

// reset password
export const resetPassword = async (request, response) => {
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
        const admin = await AdminModel.findOne({ email });

        if (!admin) {
            return response.status(400).json({
                message: "Invalid request",
                success: false,
                error: true
            });
        }

        // 5. security check → OTP must be verified already
        if (admin.resetOtp || admin.otpExpiry) {
            return response.status(403).json({
                message: "OTP not verified",
                success: false,
                error: true
            });
        }

        // 6. hash new password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        // 7. update password + clear any leftover fields (NO save)
        await AdminModel.updateOne(
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
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("Reset Password Error:", error);

        return response.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


//============================================================< Escorts >======================================================================

// fetch escorts
export async function fetchEscortcontroller(request, response) {
    try {
        const { role } = request.query;

        let filter = {};

        if (role) filter.role = role;

        // filter.isEmailVerified = false;
        filter.isVerified = false;


        const escorts = await EscortModel.find(filter)
            .sort({ createdAt: -1 });

        let mobile = escorts.mobile;

        try {
            if (mobile?.startsWith("enc:")) {
                mobile = decrypt(mobile.replace("enc:", ""));
            } else {
                mobile = decrypt(mobile);
            }
        } catch {
            mobile = "";
        }

        escorts.mobile = mobile;

        return response.status(200).json({
            message: escorts?.length ? "Escort list fetched" : "No escorts found",
            error: false,
            success: true,
            data: escorts || [],
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// fetch escort-details
export async function fetchEscortdetailscontroller(request, response) {
    try {
        const { escortId } = request.query;

        if (!escortId) {
            return response.status(400).json({
                message: "EscortId is missing",
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

        let mobile = escort.mobile;

        try {
            if (mobile?.startsWith("enc:")) {
                mobile = decrypt(mobile.replace("enc:", ""));
            } else {
                mobile = decrypt(mobile);
            }
        } catch {
            mobile = "";
        }

        escort.mobile = mobile;


        return response.status(200).json({
            message: "Escort details fetched",
            success: true,
            error: false,
            data: escort
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}

export async function escortProfileDetails(request, response) {
    try {
        const { id } = request.query;

        if (!id) {
            return response.status(400).json({
                message: "Escort Id is missing",
                success: false,
                error: true
            })
        }

        const escort = await EscortModel.findById(id)
            .populate("services")
            .populate("rates")
            .populate("blog")
            .populate("newsTour")
            .populate("tours")

        let mobile = escort.mobile;

        try {
            if (mobile?.startsWith("enc:")) {
                mobile = decrypt(mobile.replace("enc:", ""));
            } else {
                mobile = decrypt(mobile);
            }
        } catch {
            mobile = "";
        }

        escort.mobile = mobile;


        return response.status(200).json({
            message: "Escort profile details fetched",
            success: true,
            error: false,
            data: escort
        })

    } catch (error) {
        console.log("Escort profile details Error: ", error);
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}

// update escort
export async function updateEscortcontroller(request, response) {
    try {
        const { escortId, action, reason } = request.body;

        let updateData = {};
        let emailSubject = "";
        let emailHtml = "";

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(400).json({
                message: "escortId not found",
                success: false,
                error: true
            })
        }

        const verifyLink = `https://www.greenevelvet.com/login`

        const verifyHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Top Success Bar -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Header -->
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
            <div style="margin-bottom: 20px;">
                <span style="font-size: 40px;">🎉</span>
            </div>
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:22px;font-weight:600;">Welcome Aboard, ${escort.name}!</h2>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;">
              Great news! Your account has been <b>successfully verified</b> by our admin team. You now have full access to your dashboard and features.
            </p>

            <!-- Login Button -->
            <div style="margin:30px 0;">
              <a href="${verifyLink}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 45px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Login to Your Account
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              We are excited to have you with us. If you have any questions, feel free to reach out to our support team.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Empowering your professional journey.
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

        const rejectedHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Subtle Red Top Bar (Indicates Action Required) -->
        <tr>
          <td height="5" style="background-color:#e74c3c;"></td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;text-align:center;">Account Status Update</h2>
            <p style="margin:0 0 20px 0;color:#555555;font-size:15px;line-height:22px;text-align:center;">
              Hello <strong>${escort.name}</strong>, we reviewed your profile verification request. Unfortunately, it could not be approved at this time.
            </p>

            <!-- Reason Box -->
            <div style="margin:25px 0;background-color:#fff5f5;border-left:4px solid #e74c3c;padding:15px 20px;">
              <span style="display:block;font-size:12px;color:#e74c3c;font-weight:700;margin-bottom:5px;text-transform:uppercase;">Reason for Rejection:</span>
              <p style="margin:0;color:#2d3436;font-size:15px;font-weight:500;">
                ${reason || "Incomplete or unclear documentation provided."}
              </p>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px; text-align:center;">
              Please log in to your dashboard to update your information and re-submit your profile for review.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Need help? Please contact our support team.
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

        if (action === "Active") {
            updateData = {
                isVerified: true,
                status: "Active",
                docsuploadStatus: "approved"
            };

            emailSubject = "Your account has been verified ✅ - GreeneVelvet";
            emailHtml = verifyHtml;
        }

        else if (action === "Suspended") {
            updateData = {
                isVerified: false,
                status: "Suspended",
                docsuploadStatus: "failed",
                reason
            };

            emailSubject = "Your verification was rejected - GreeneVelvet";
            emailHtml = rejectedHtml;
        }

        else {
            return response.status(400).json({
                message: "action is undefined!",
                success: false,
                error: true
            });
        }

        console.log("updateData", updateData);

        const updatedEscort = await EscortModel.findOneAndUpdate(
            { escortId: escortId },
            updateData,
            { new: true }
        )

        if (!updatedEscort) {
            return response.status(404).json({
                message: "Escort updation failed",
                success: false,
                error: true
            });
        }

        if (escort.email) {
            await sendMail(escort.email, emailSubject, emailHtml);
        }

        return response.status(200).json({
            message: `Escort ${action} successful and email sent`,
            success: true,
            error: false,
            data: updatedEscort
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}

//  delete escort 
export async function deleteEscortcontroller(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId is required",
                success: false,
                error: true
            })
        }

        const deletedEscort = await EscortModel.findOneAndDelete({ escortId })

        if (!deletedEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            })
        }

        return response.status(200).json({
            message: "Escort delete successfull",
            success: true,
            error: false,
            data: deletedEscort
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        })
    }
}

// fecth verified escorts 
export async function verifiedEscortcontroller(request, response) {
    try {
        const { role, isVerified } = request.query;

        let filter = {};

        if (role) filter.role = role;

        if (isVerified !== undefined)
            filter.isVerified = isVerified === "true";

        const escorts = await EscortModel.find(filter)
            .sort({ createdAt: -1 });

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

//==========================================================< Clients >======================================================================

// fetch clients
export async function fetchClients(request, response) {
    try {
        const { role } = request.query;

        let filter = {};

        if (role) filter.role = role;

        const clients = await ClientModel.find(filter)
            .sort({ createdAt: -1 });


        return response.status(200).json({
            message: clients.length ? "clients list fetched" : "No clients found",
            error: false,
            success: true,
            data: clients || [],
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

// fetch client-details
export async function fetchClientdetails(request, response) {
    try {
        const { _id } = request.query;

        if (!_id) {
            return response.status(400).json({
                message: "client Id is missing",
                success: false,
                error: true
            })
        }

        const client = await ClientModel.findById({ _id });

        if (!client) {
            return response.status(404).json({
                message: "client not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "client details fetched",
            success: true,
            error: false,
            data: client
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        })
    }
}

// update client
export async function updateClient(request, response) {
    try {
        const { _id, action, reason } = request.body;

        if (!_id || !action) {
            return response.status(400).json({
                message: "Client ID and action are required",
                success: false
            });
        }

        const client = await ClientModel.findById({ _id });

        if (!client) {
            return response.status(404).json({
                message: "client Id not found",
                success: false,
                error: true
            })
        }

        const verifyHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Success Bar -->
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

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <div style="margin-bottom: 20px;">
                <span style="font-size: 40px;">✅</span>
            </div>
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:22px;font-weight:600;">Verification Approved!</h2>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;">
              Hello <strong>${client.name}</strong>, your account has been verified by the admin. You are now a verified member of <b>Greene Velvet</b>.
            </p>

            <!-- Login Action -->
            <div style="margin:30px 0;">
              <a href="${loginLink}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 45px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Login to Dashboard
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              You can now access all our premium services and features. Welcome to the community!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Verified Partner Account
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

        const suspendHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Danger/Alert Top Bar -->
        <tr>
          <td height="5" style="background-color:#d63031;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;">
            <div style="text-align:center; margin-bottom:20px;">
                <span style="font-size: 40px;">⚠️</span>
            </div>
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;text-align:center;">Account Suspended</h2>
            <p style="margin:0 0 20px 0;color:#555555;font-size:15px;line-height:22px;text-align:center;">
              Hello <strong>${client.name}</strong>, this is to inform you that your account access has been suspended by our administration team.
            </p>

            <!-- Suspension Reason Box -->
            <div style="margin:25px 0;background-color:#fff5f5;border:1px solid #fab1a0;border-radius:8px;padding:20px;">
              <span style="display:block;font-size:12px;color:#d63031;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Reason for Suspension:</span>
              <p style="margin:0;color:#2d3436;font-size:15px;font-weight:500;line-height:1.5;">
                ${updateData.reason || "Violation of community guidelines or terms of service."}
              </p>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px; text-align:center;">
              While suspended, you will not be able to access your dashboard or services. If you believe this is a mistake, please contact our support desk.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Compliance & Security Department
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

        let updateData = {};
        let emailSubject = "";
        let emailHtml = "";

        if (action === "Active") {
            updateData = {
                status: "Active",
                reason: ""
            };
            const verifyLink = `https://www.greenevelvet.com/login`

            emailSubject = "Account Activated  ✅ - GreeneVelvet";
            emailHtml = verifyHtml;
        }

        else if (action === "Suspended") {
            updateData = {
                isVerified: false,
                status: "Suspended",
                reason: reason || "Violation of platform policies"
            };

            emailSubject = "Account Suspended ❌ - GreeneVelvet";
            emailHtml = suspendHtml;
        }

        else {
            return response.status(400).json({
                message: "action is undefined!",
                success: false,
                error: true
            });
        }

        console.log("updateData", updateData);

        const updatedClient = await ClientModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true }
        );

        if (client.email) {
            await sendMail(client.email, emailSubject, emailHtml);
        }

        return response.status(200).json({
            message: `Client ${action} successfully`,
            success: true,
            error: false,
            data: updatedClient
        })

    } catch (error) {
        console.log("UPDATE CLIENT ERROR:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        })
    }
}

//  delete client
export async function deleteClient(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "client Id is required",
                success: false,
                error: true
            })
        }

        const deletedClient = await ClientModel.findByIdAndDelete({ _id })

        if (!deletedClient) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            })
        }

        return response.status(200).json({
            message: "Client delete successfull",
            success: true,
            error: false,
            data: deletedClient
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true,
        })
    }
}

//============================================================< Tours >==========================================================================
// fetch tours
export async function fetchTours(request, response) {
    try {

        const tours = await TourModel.find()
            .populate("userId", "name")
            .sort({ createdAt: -1 });

        const formattedTours = tours.map(tour => ({
            ...tour.toObject(),
            escortName: tour.userId?.name
        }));

        return response.status(200).json({
            message: tours.length ? "Tours list fetched" : "No tour found",
            error: false,
            success: true,
            data: formattedTours || [],
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

// fetch tour details
export async function fetchTourDetails(request, response) {
    try {
        const { _id } = request.query;

        if (!_id) {
            return response.status(400).json({
                message: "Tour ID is required",
                success: false,
                error: true
            });
        }

        const tour = await TourModel.findById(_id)
            .populate("userId", "name");

        if (!tour) {
            return response.status(404).json({
                message: "Tour not found",
                success: false,
                error: true
            });
        }

        const formattedTour = {
            ...tour.toObject(),
            escortName: tour.userId?.name
        };

        return response.status(200).json({
            message: "Tour details fetched successfully",
            success: true,
            error: false,
            data: formattedTour
        });

    } catch (error) {
        console.log("FETCH TOUR DETAILS ERROR:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

// delete tour
export async function deleteTour(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Tour ID required",
                success: false,
                error: true
            });
        }

        const tour = await TourModel.findById(_id);

        if (!tour) {
            return response.status(404).json({
                message: "Tour not found",
                success: false,
                error: true,
            });
        }

        const today = new Date();
        const start = new Date(tour.startDate);
        const end = new Date(tour.endDate);

        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (start <= today && end >= today) {
            return response.status(400).json({
                message: "Cannot delete an ongoing tour",
                success: false,
                error: true,
            });
        }

        await tour.deleteOne();

        return response.status(200).json({
            message: "Tour deleted successfully",
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
//=================================================================< Blogs >================================================================

// fetch blogs
export async function fetchBlogs(request, response) {
    try {

        const blogs = await BlogModel.find()
            .populate("userId", "name")
            .sort({ createdAt: -1 });

        const formattedBlogs = blogs.map(blog => ({
            ...blog.toObject(),
            userName: blog.userId?.name
        }));

        return response.status(200).json({
            message: formattedBlogs.length ? "Blogs list fetched" : "No blog found",
            error: false,
            success: true,
            data: formattedBlogs
        })

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

// fetch blog details
export async function fetchBlogDetails(request, response) {
    try {
        const { _id } = request.query;

        if (!_id) {
            return response.status(400).json({
                message: "Blog ID is required",
                success: false,
                error: true
            });
        }

        const blog = await BlogModel.findById(_id)
            .populate("userId", "name");

        if (!blog) {
            return response.status(404).json({
                message: "Blog not found",
                success: false,
                error: true
            });
        }

        const formattedBlog = {
            ...blog.toObject(),
            escortName: blog.userId?.name
        };

        return response.status(200).json({
            message: "Blog details fetched successfully",
            success: true,
            error: false,
            data: formattedBlog
        });

    } catch (error) {
        console.log("FETCH TOUR DETAILS ERROR:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

export async function updateBlogStatus(request, response) {
    try {
        const { _id, status } = request.body;

        if (!_id || !status) {
            return response.status(400).json({
                message: "ID and status required",
                success: false,
                error: true
            });
        }

        const updated = await BlogModel.findByIdAndUpdate(
            _id,
            { status },
            { new: true }
        );

        if (!updated) {
            return response.status(404).json({
                message: "Not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: `Status updated to ${status}`,
            success: true,
            error: false,
            data: updated
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
}

// delete blog and related data
export async function deleteBlog(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Blog ID required",
                success: false,
                error: true
            });
        }

        const blog = await BlogModel.findById(_id);

        if (!blog) {
            return response.status(404).json({
                message: "Blog not found",
                success: false,
                error: true,
            });
        }

        // 🔥 1. Delete media from Cloudinary
        if (blog.media && blog.media.length > 0) {
            await Promise.all(
                blog.media.map(item =>
                    item.public_id &&
                    cloudinary.uploader.destroy(item.public_id, {
                        resource_type: item.type === "video" ? "video" : "image"
                    })
                )
            );
        }

        // 🔥 2. Delete comments & likes
        await BlogCommentsModel.deleteMany({ postId: _id });
        await BlogLikesModel.deleteMany({ postId: _id });

        // 🔥 3. Remove blog reference from Escort
        await EscortModel.updateMany(
            { blog: _id },
            { $pull: { blog: _id } }
        );

        // 🔥 4. Delete blog
        await blog.deleteOne();

        return response.status(200).json({
            message: "Blog, media, comments & likes deleted successfully",
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
//=================================================================< NewsandTours >================================================================

// fetch newsandtours
export async function fetchNewsandtours(request, response) {
    try {

        const newsandtours = await NewsAndTourModel.find()
            .populate("userId", "name")
            .sort({ createdAt: -1 });

        const formattedNewsandtours = newsandtours.map(newsandtour => ({
            ...newsandtour.toObject(),
            escortName: newsandtour.userId?.name
        }));

        return response.status(200).json({
            message: formattedNewsandtours.length ? "Newsandtours list fetched" : "No Newsandtour found",
            error: false,
            success: true,
            data: formattedNewsandtours || [],
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        })
    }
}

// fetch newsandtour details
export async function fetchNewsandtourDetails(request, response) {
    try {
        const { _id } = request.query;

        if (!_id) {
            return response.status(400).json({
                message: "Newsandtour ID is required",
                success: false,
                error: true
            });
        }

        const newsandtour = await NewsAndTourModel.findById(_id)
            .populate("userId", "name");

        if (!newsandtour) {
            return response.status(404).json({
                message: "Newsandtour not found",
                success: false,
                error: true
            });
        }

        const formattedNewsandtour = {
            ...newsandtour.toObject(),
            escortName: newsandtour.userId?.name
        };

        return response.status(200).json({
            message: "Newsandtour details fetched successfully",
            success: true,
            error: false,
            data: formattedNewsandtour
        });

    } catch (error) {
        console.log("FETCH TOUR DETAILS ERROR:", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

// update newstour status
export async function updateNewsandtourStatus(request, response) {
    try {
        const { _id, status } = request.body;

        if (!_id || !status) {
            return response.status(400).json({
                message: "ID and status required",
                success: false,
                error: true
            });
        }

        const updated = await NewsAndTourModel.findByIdAndUpdate(
            _id,
            { status },
            { new: true }
        );

        if (!updated) {
            return response.status(404).json({
                message: "Not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: `Status updated to ${status}`,
            success: true,
            error: false,
            data: updated
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
}

// delete newsandtour and related data like and comments
export async function deleteNewsandtour(request, response) {
    try {
        const { _id } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "Newsandtour ID required",
                success: false,
                error: true
            });
        }

        const newsandtour = await NewsAndTourModel.findById(_id);

        if (!newsandtour) {
            return response.status(404).json({
                message: "Newsandtour not found",
                success: false,
                error: true,
            });
        }

        if (newsandtour.media && newsandtour.media.length > 0) {
            await Promise.all(
                newsandtour.media.map(item =>
                    item.public_id &&
                    cloudinary.uploader.destroy(item.public_id, {
                        resource_type: item.type === "video" ? "video" : "image"
                    })
                )
            );
        }

        await NewstourCommentsModel.deleteMany({ postId: _id });
        await NewstourLikesModel.deleteMany({ postId: _id });
        await newsandtour.deleteOne();

        await EscortModel.updateMany(
            { newsTour: _id },
            { $pull: { newsTour: _id } }
        );

        return response.status(200).json({
            message: "Newsandtour and related data deleted successfully",
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

// ======================================================<  >==============================================================

