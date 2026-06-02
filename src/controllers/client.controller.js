import bcryptjs from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import ClientModel from "../models/clientModel.js";
import { generatedclientId } from "../utils/generatedId.js";
import uploadImageCloudinary from "../utils/uploadImageCloudinary.js";
import EscortModel from "../models/escortModel.js";
import { sendVerificationEmail } from "../utils/emailService.js";
import { sendRegistrationNotification } from "../utils/sendRegistrationNotification.js";
import { encrypt } from "../utils/crypto.js";

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
            message: "Registration successful! Please check your email and verify your email address to activate your account.",
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
            return response.status(400).json({
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

        const clientDetails = await ClientModel.findOne({ clientId }).select("-password");

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


// edit and update Client account details 
export async function updateClientProfile(request, response) {
    try {
        const { _id, onlineStatus, contactVisible, muteNotifications } = request.body;

        if (!_id) {
            return response.status(400).json({
                message: "User id required",
                success: false,
                error: true
            });
        }

        // ✅ only defined fields
        const updateData = {};
        if (onlineStatus !== undefined) updateData.onlineStatus = onlineStatus;
        if (contactVisible !== undefined) updateData.contactVisible = contactVisible;
        if (muteNotifications !== undefined) updateData.muteNotifications = muteNotifications;

        const updatedClient = await ClientModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedClient) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Profile updated successfully",
            success: true,
            error: false,
            data: updatedClient
        });

    } catch (error) {
        console.log("update error ", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            error: true,
            success: false
        });
    }
}

//  permanent delete Client profile
export async function deleteClientProfile(request, response) {
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
        const deletedClient = await ClientModel.findByIdAndDelete(_id);

        if (!deletedClient) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            });
        }


        return response.status(200).json({
            message: "Client profile and related data deleted",
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
export async function editClientProfileDetails(request, response) {
    try {
        const {
            _id,
            name,
            mobile,
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

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (mobile !== undefined) updateData.mobile = mobile;
        if (country !== undefined) updateData.country = country;
        if (city !== undefined) updateData.city = city;

        // ✅ UPDATE USER
        const updatedClient = await ClientModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedClient) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Profile updated successfully",
            success: true,
            error: false,
            data: updatedClient
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

// change mobile
export async function clientChangeMobile(request, response) {
    try {
        const { clientId, mobile, countryCode } = request.body;

        if (!clientId || !mobile) {
            return response.status(400).json({
                message: "ClientId and mobile is required",
                success: false,
                error: true
            })
        }

        const updateMobile = await ClientModel.findOneAndUpdate(
            { clientId },
            {
                mobile: mobile,
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

// change password
export const clientChangePassword = async (request, response) => {
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
        const user = await ClientModel.findById(userId).select("+password");

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

        await ClientModel.findByIdAndUpdate(userId, {
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


// add favorites escort 
export async function toggleFavoriteEscort(request, response) {
    try {
        const id = request.user?._id;

        const { escortId } = request.body;

        if (!escortId) {
            return response.status(400).json({
                message: "Escort ID are required",
                success: false,
                error: true
            });
        }

        const client = await ClientModel.findOne({ id });

        if (!client) {
            return response.status(404).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        const escortExists = await EscortModel.findById(escortId);

        if (!escortExists) {
            return response.status(404).json({
                message: "Escort not found",
                success: false,
                error: true
            });
        }

        const alreadyFavorite = client.favorites.some(
            (id) => id.toString() === escortId.toString()
        );

        if (alreadyFavorite) {
            await ClientModel.updateOne(
                { id },
                {
                    $pull: {
                        favorites: escortId
                    }
                }
            );

            return response.status(200).json({
                message: "Escort removed from favorites",
                success: true,
                error: false,
                isFavorite: false
            });
        }

        await ClientModel.updateOne(
            { id },
            {
                $addToSet: {
                    favorites: escortId
                }
            }
        );

        return response.status(200).json({
            message: "Escort added to favorites",
            success: true,
            error: false,
            isFavorite: true
        });

    } catch (error) {
        console.log("toggle favorite error", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

// fetch favorites escort 
export async function getFavoriteEscorts(request, response) {
    try {
        const { id } = request.user?._id;

        if (!id) {
            return response.status(400).json({
                message: "User not found",
                success: false,
                error: true
            });
        }

        const client = await ClientModel.findOne({ id })
            .populate({
                path: "favorites",
                select: `
                    escortId
                    name
                    avatar
                    city
                    country
                    age
                    onlineStatus
                    isVerified
                    last_login_date
                `
            });

        if (!client) {
            return response.status(404).json({
                message: "Client not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Favorite escorts fetched successfully",
            success: true,
            error: false,
            count: client.favorites.length,
            data: client.favorites
        });

    } catch (error) {
        console.log("favorite escorts error", error);

        return response.status(500).json({
            message: error.message || "Internal server error",
            success: false,
            error: true
        });
    }
}

