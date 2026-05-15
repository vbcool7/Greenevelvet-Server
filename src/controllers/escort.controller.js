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



// Escort Register controll
export async function registerEscortcontroller(request, response) {
    try {

        const { name, email, password, mobile, country, countryCode, city, account_classification, account_type, adverties_category } = request.body

        const mobileEncrypted = "enc:" + encrypt(mobile);

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

        const escortId = await generatedescortId()

        const token = crypto.randomBytes(32).toString("hex")

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(password, salt)

        const payload = {
            escortId,
            name,
            email: normalizedEmail,
            password: hashPassword,
            mobile: mobileEncrypted,
            country,
            countryCode,
            city,
            account_classification,
            account_type,
            adverties_category,
            emailVerifyToken: token,
            emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }


        const newEscort = new EscortModel(payload)
        const save = await newEscort.save()

        console.log("newEscort", newEscort);


        const verifyLink = `https://greenvelvet-api.onrender.com/escort/verify-email?token=${token}`

        await sendVerificationEmail(normalizedEmail, verifyLink, escortId);

        await sendRegistrationNotification({ email: process.env.ADMIN_RECEIVER_EMAIL, modelName: name })

        return response.status(200).json({
            message: "Verification link sent to your email",
            error: false,
            success: true,
            data: {
                escortId: save.escortId,
                mobile: mobile,
                email: save.email,
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

// Escort verify email controll
export async function verifyEmailcontroller(request, response) {
    try {
        const { token } = request.query;

        const escort = await EscortModel.findOne({
            emailVerifyToken: token,
            emailVerifyExpiry: { $gt: Date.now() },
        });

        if (!escort) {
            return response.redirect("https://www.greenevelvet.com/link-expired");
        }

        escort.isEmailVerified = true;
        escort.emailVerifyToken = null;
        escort.emailVerifyExpiry = null;

        await escort.save();

        if (!escort || !escort.escortId) {
            return response.status(400).json({
                message: "Invalid escort data",
                error: true,
                success: false
            });
        }

        response.redirect(`https://www.greenevelvet.com/confirmmobilenumber/${escort.escortId}`);


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true,
        })
    }
}

// Escort change mobile number controll
export async function changeMobilenumber(request, response) {
    try {
        const { escortId, mobile, countryCode } = request.body;

        const mobileEncrypted = encrypt(request.body.mobile);


        if (!escortId || !mobile) {
            return response.status(400).json({
                message: "EscortId and mobile is required",
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

        const escort = await EscortModel.findOne({ escortId });

        if (!escort) {
            return response.status(400).json({
                message: "Unauthorised access failed",
                success: false,
                error: true
            })
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await otpModel.create({
            mobile,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
        });

        // Prepare SMS payload
        const smsPayload = {
            sms_text: `Your Greene Velvet OTP is ${otp}`,
            numbers: [mobile],
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

        console.log("CELLCAST RESPONSE:", cellcastResponse.data);

        return response.json({
            message: "Otp sent successfully",
            success: true,
            error: false,

        })
    } catch (error) {
        console.log("SEND OTP ERROR:", error.response?.data || error.message);

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }

}

// Escort verify mobile otp controll
export async function verifyMobileotp(request, response) {
    try {
        let { escortId, mobile, otp, countryCode } = request.body; // 👈 let use karo

        console.log("mobile and otp", mobile, otp);

        if (!mobile || !otp) {
            return response.status(400).json({
                message: "Mobile and OTP required",
                success: false,
                error: true
            });
        }

        // clean mobile number

        console.log("clean mobile:", mobile, "otp:", otp);

        const escort = await EscortModel.findOne({ escortId });
        console.log("search escort by mobile", escort);

        if (!escort) {
            return response.status(404).json({
                message: "Mobile number not registered",
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

        await EscortModel.updateOne(
            { escortId },
            { $set: { isMobileVerified: true } } // ✅ correct field
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

// Escort add details controll
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
            { $set: restData },   // 👈 direct fields save
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

// Escort upload verification doc controll
export async function escortUploadverification(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId required",
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

        const selfieUpload = await uploadImageCloudinary(request.files.verificationselfie[0], "verification/verificationselfie");
        const govtIdUpload = await uploadImageCloudinary(request.files.verificationgovtId[0], "verification/verificationgovtId");

        const uploadEscort = await EscortModel.findOneAndUpdate(
            { escortId },
            {
                verificationselfie: selfieUpload.secure_url,
                verificationgovtId: govtIdUpload.secure_url,
                docsuploadStatus: "pending",
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
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
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

// upload Avatar
export async function uploadAvatarcontroller(request, response) {
    try {
        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "escortId required",
                success: false,
                error: true
            })
        }

        if (!request.files?.avatar) {
            return response.status(400).json({
                message: "avatar required",
                success: false,
                error: true
            })
        }

        const avatarUpload = await uploadImageCloudinary(request.files.avatar[0], "profileImg/avatar");

        const uploadEscort = await EscortModel.findOneAndUpdate(
            { escortId },
            {
                avatar: avatarUpload.secure_url,
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
                { $push: { "gallery.photos": { $each: uploadedImages } } }
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
                { $push: { "gallery.videos": { $each: uploadedVideos } } }
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
        if (filters.fmt === true) query.fmt = true;

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

        query.avatar = {
            $exists: true,
            $type: "string",
            $nin: [null, ""]
        };

        // 🔹 Fetch escorts (NO populate)
        const escortList = await EscortModel.find(query);


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
            .select("escortId name city country gender account_type adverties_category highlights avatar rateFrom isFaceBlurred")
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

        query.avatar = {
            $exists: true,
            $ne: null,
            $type: "string",
            $ne: ""
        };

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

        console.log("post :", post);

        // ✅ push post id into escort model
        await EscortModel.findOneAndUpdate(
            { escortId },
            { $push: { newsTour: post._id } }
        );

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

        console.log("like request body : ", request.body);

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

        console.log("existingLike : ", existingLike);

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

        console.log("Like : ", like);

        await NewsAndTourModel.updateOne(
            { _id: postId },
            { $push: { newstourLikes: like._id } }
        );

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
            status,
            title,
            notAvailable,
            type // booking | availability
        } = request.body;

        // ===============================
        // Validation
        // ===============================

        if (!userId || !escortId || !date || !type) {

            return response.status(400).json({
                message: "Required fields missing",
                success: false,
                error: true
            });

        }

        // ===============================
        // Time Setup
        // ===============================

        let start = startTime;
        let end = endTime;

        if (isAllDay || notAvailable) {

            start = "00:00";
            end = "23:59";

        }

        // ===============================
        // Create Proper DateTime
        // ===============================

        let startDateTime = new Date(`${date}T${start}:00`);
        let endDateTime = new Date(`${date}T${end}:00`);

        // ✅ Overnight Support
        // Example:
        // 11 PM → 2 AM
        // 23:00 → 02:00

        if (endDateTime <= startDateTime) {

            endDateTime.setDate(
                endDateTime.getDate() + 1
            );

        }

        // ===============================
        // Get Same Date Records
        // ===============================

        const existingSlots = await BookingModel.find({
            escortId,
            date
        });

        // ===============================
        // Conflict Check
        // ===============================

        let hasConflict = false;

        for (const slot of existingSlots) {

            let slotStart = new Date(
                `${new Date(slot.date).toISOString().split("T")[0]}T${slot.startTime}:00`
            );

            let slotEnd = new Date(
                `${new Date(slot.date).toISOString().split("T")[0]}T${slot.endTime}:00`
            );

            // Overnight Existing Slot
            if (slotEnd <= slotStart) {

                slotEnd.setDate(
                    slotEnd.getDate() + 1
                );

            }

            const overlap =
                startDateTime < slotEnd &&
                endDateTime > slotStart;

            if (!overlap) continue;

            // =====================================
            // RULES
            // =====================================

            // ❌ Availability inside Booking NOT allowed

            if (
                type === "availability" &&
                slot.type === "booking"
            ) {

                hasConflict = true;
                break;

            }

            // ✅ Booking inside Availability ALLOWED

            if (
                type === "booking" &&
                slot.type === "availability"
            ) {

                continue;

            }

            // ❌ Same type overlap block

            hasConflict = true;
            break;

        }

        if (hasConflict) {

            return response.status(400).json({
                message:
                    type === "booking"
                        ? "Time slot already booked"
                        : "Availability conflicts with booking",
                success: false,
                error: true
            });

        }

        // ===============================
        // Create Record
        // ===============================

        const booking = await BookingModel.create({

            userId,
            escortId,
            date,

            startTime: start,
            endTime: end,

            isAllDay,
            status: status || "active",
            title,
            notAvailable,
            type

        });

        // ===============================
        // Push into Escort
        // ===============================

        await EscortModel.findOneAndUpdate(

            { escortId },

            {
                $push: {
                    bookings: booking._id
                }
            }

        );

        // ===============================
        // Success
        // ===============================

        return response.status(201).json({

            message:
                type === "booking"
                    ? "Booking added successfully"
                    : "Availability added successfully",

            success: true,
            error: false,
            data: booking

        });

    } catch (error) {

        console.log("create booking error", error);

        return response.status(500).json({

            message: error.message || "Server error",
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
export const updateBooking = async (request, response) => {
    try {

        const {
            _id,
            date,
            startTime,
            endTime,
            isAllDay,
            status,
            title,
            notAvailable,
            type
        } = request.body;

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

        // ✅ Time fix
        const start = isAllDay ? "00:00" : startTime || booking.startTime;
        const end = isAllDay ? "23:59" : endTime || booking.endTime;

        // ✅ Conflict check (exclude current booking)
        const isConflict = await BookingModel.findOne({
            escortId: booking.escortId,
            date: date || booking.date,
            _id: { $ne: _id },
            $or: [
                {
                    startTime: { $lt: end },
                    endTime: { $gt: start }
                }
            ]
        });

        if (isConflict) {
            return response.status(400).json({
                message: "Time slot already booked",
                success: false,
                error: true
            });
        }

        // ✅ Update fields
        booking.date = date || booking.date;
        booking.startTime = start;
        booking.endTime = end;
        booking.isAllDay = isAllDay ?? booking.isAllDay;
        booking.status = status || booking.status;
        booking.title = title || booking.title;
        booking.notAvailable = notAvailable || booking.notAvailable;
        booking.type = type || booking.type;

        await booking.save();

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

        console.log("req filter: ", filter);

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
        const { _id, name, onlineStatus, displayContact, notifications } = request.body;

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
        if (displayContact !== undefined) updateData.displayContact = displayContact;
        if (notifications !== undefined) updateData.notifications = notifications;

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

        // ✅ delete escort
        const deletedEscort = await EscortModel.findByIdAndDelete(_id);

        if (!deletedEscort) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        await BlogModel.deleteMany({ userId: _id });
        await ServiceModel.deleteMany({ userId: _id });
        await RatesModel.deleteMany({ userId: _id });
        await NewsAndTourModel.deleteMany({ userId: _id });
        await TourModel.deleteMany({ userId: _id });
        await BookingModel.deleteMany({ userId: _id });

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