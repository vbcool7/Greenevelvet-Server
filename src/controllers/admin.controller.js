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

//============================================================< Escorts >======================================================================

// fetch escorts
export async function fetchEscortcontroller(request, response) {
    try {
        const { role } = request.query;

        let filter = {};

        if (role) filter.role = role;

        filter.isEmailVerified = false;
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

        if (action === "Active") {
            updateData = {
                isVerified: true,
                status: "Active",
                docsuploadStatus: "approved"
            };
            const verifyLink = `http://localhost:5174/login`

            emailSubject = "Your account has been verified ✅ - GreeneVelvet";
            emailHtml = `
            <h2>Hello ${escort.name}</h2>
            <p>Your account has been successfully verified by admin.</p>
            <p>You can now login and start using your account.</p>
            <a href="${verifyLink}" 
            style="display:inline-block;padding:12px 20px;
            background:#0a7cff;color:#fff;text-decoration:none;
            border-radius:5px;">
            Login
            </a>
            `;
        }

        else if (action === "Suspended") {
            updateData = {
                isVerified: false,
                status: "Suspended",
                docsuploadStatus: "failed",
                reason
            };

            emailSubject = "Your verification was rejected ❌ - GreeneVelvet";
            emailHtml = `
            <h2>Hello ${escort.name}</h2>
            <p>Your verification was rejected.</p>
            <p><b>Reason:</b> ${reason || "Incomplete documents"}</p>
            `;
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

// verified escorts 
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

        let updateData = {};
        let emailSubject = "";
        let emailHtml = "";

        if (action === "Active") {
            updateData = {
                status: "Active",
                reason: ""
            };
            const verifyLink = `http://localhost:5174/login`

            emailSubject = "Account Activated  ✅ - GreeneVelvet";
            emailHtml = `
            <h2>Hello ${client.name}</h2>
            <p>Your account has been activated by admin.</p>
            <p>You can now continue using the platform.</p>
            <a href="${verifyLink}" 
            style="display:inline-block;padding:12px 20px;
            background:#0a7cff;color:#fff;text-decoration:none;
            border-radius:5px;">
            Login
            </a>
            `;
        }

        else if (action === "Suspended") {
            updateData = {
                isVerified: false,
                status: "Suspended",
                reason: reason || "Violation of platform policies"
            };

            emailSubject = "Account Suspended ❌ - GreeneVelvet";
            emailHtml = `
            <h2>Hello ${client.name}</h2>
            <p>Your account has been suspended by admin.</p>
            <p><b>Reason:</b> ${updateData.reason}</p>
            `;
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

