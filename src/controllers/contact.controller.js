import ContactModel from "../models/contactModel.js";
import mongoose from "mongoose";
import { sendMail } from "../utils/sendMail.js";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";

// create contact
export const createContact = async (request, response) => {
  try {
    const { fullname, mobile, email, inquiryType, profileLink, message } =
      request.body;

    if (!fullname || !email || !message || !inquiryType) {
      return response.status(400).json({
        message: "Name, email, inquiry and message are required",
        success: false,
        error: true,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ parallel queries (fast)
    const [escort, client] = await Promise.all([
      EscortModel.findOne({
        email: normalizedEmail,
      }).lean(),
      ClientModel.findOne({
        email: normalizedEmail,
      }).lean(),
    ]);

    let role = "Visitor";

    // ✅ conflict handling
    if (escort && client) {
      return response.status(400).json({
        message: "Email exists in both Escort and Client",
        success: false,
        error: true,
      });
    }

    if (escort) role = "Escort";
    else if (client) role = "Client";

    const contact = new ContactModel({
      fullname,
      mobile,
      email: normalizedEmail,
      inquiryType,
      profileLink,
      message,
      role,
    });

    await contact.save();

    return response.status(201).json({
      message: "Your inquiry has been submitted successfully",
      success: true,
      error: false,
      data: contact,
    });
  } catch (error) {
    console.log("Your inquiry has been submitted error ", error);

    return response.status(500).json({
      message: "Your inquiry has been submitted failed!",
      success: false,
      error: true,
    });
  }
};

// fetch all contact
export const getAllContacts = async (request, response) => {
  try {
    const {
      search = "",
      status = "all",
      role = "all",
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = request.query;

    const filter = {};

    // Status filter
    if (status !== "all") {
      filter.status = status;
    }

    // Role filter
    if (role !== "all") {
      filter.role = role;
    }

    // Search filter
    if (search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      filter.$or = [
        { fullname: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { message: searchRegex },
        { inquiryType: searchRegex },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const fromDate = new Date(startDate);
        fromDate.setHours(0, 0, 0, 0);

        if (isNaN(fromDate.getTime())) {
          return response.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.createdAt.$gte = fromDate;
      }

      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);

        if (isNaN(toDate.getTime())) {
          return response.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        filter.createdAt.$lte = toDate;
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 10));

    const [contacts, totalCount] = await Promise.all([
      ContactModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),

      ContactModel.countDocuments(filter),
    ]);

    return response.status(200).json({
      message: "Support tickets fetched successfully",
      success: true,
      error: false,
      data: contacts,
      pagination: {
        totalCount,
        currentPage,
        limit: perPage,
        totalPages: Math.ceil(totalCount / perPage),
        hasNextPage: currentPage * perPage < totalCount,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.log("Fetch all contacts error:", error);

    return response.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// send reply by email
export const replyContact = async (request, response) => {
  try {
    const { id } = request.params;

    const { text, status } = request.body;

    if (!text || !text.trim()) {
      return response.status(400).json({
        message: "Reply text is required",
        success: false,
        error: true,
      });
    }

    // ✅ Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({
        message: "Invalid support ticket ID",
        success: false,
        error: true,
      });
    }

    // ✅ Check contact exist
    const contactData = await ContactModel.findById(id);
    if (!contactData) {
      return response.status(404).json({
        message: "Support ticket not found",
        success: false,
        error: true,
      });
    }

    // ✅ Update reply
    const contact = await ContactModel.findByIdAndUpdate(
      id,
      {
        $push: {
          adminReply: {
            text,
            sender: "Admin",
            time: new Date(),
          },
        },
        repliedAt: new Date(),
        status,
      },
      {
        new: true,
      },
    );

    console.log("contact details: ", contact);

    // ✅ Send Email
    await sendMail(
      contact.email,
      "Response to your inquiry - GREENE VELVET",
      `
           <p>Hi ${contact.fullname},</p>
           <p>${text}</p>
           <br/>
           <p>Thanks & Regards,<br/>Support Team</p>
        `,
    );

    return response.status(200).json({
      message: "Reply sent successfully",
      success: true,
      error: false,
      data: contact,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message,
      success: false,
      error: true,
    });
  }
};

// update status
export const updateContactStatus = async (request, response) => {
  try {
    const { id } = request.params;
    const { status } = request.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({
        success: false,
        error: true,
        message: "Invalid support ticket ID",
      });
    }

    const validStatus = ["pending", "in-progress", "resolved", "closed"];
    if (!validStatus.includes(status)) {
      return response.status(400).json({
        success: false,
        error: true,
        message: "Invalid status value",
      });
    }

    const contact = await ContactModel.findByIdAndUpdate(
      id,
      {
        status,
      },
      {
        new: true,
      },
    );

    if (!contact) {
      return response.status(404).json({
        success: false,
        error: true,
        message: "Support ticket not found",
      });
    }

    return response.status(200).json({
      success: true,
      error: false,
      message: "Status updated successfully",
      data: contact,
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};

// delete
export const deleteContact = async (request, response) => {
  try {
    const { id } = request.params;

    // ✅ Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({
        success: false,
        error: true,
        message: "Invalid support ticket ID",
      });
    }

    // ✅ Delete permanently
    const deletedContact = await ContactModel.findByIdAndDelete(id);

    // ✅ Not found
    if (!deletedContact) {
      return response.status(404).json({
        success: false,
        error: true,
        message: "Support ticket not found",
      });
    }

    return response.status(200).json({
      success: true,
      error: false,
      message: "Support ticket deleted permanently",
    });
  } catch (error) {
    console.log("Error ", error);

    return response.status(500).json({
      success: false,
      error: true,
      message: error.message,
    });
  }
};
