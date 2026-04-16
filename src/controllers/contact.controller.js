import ContactModel from "../models/contactModel.js";
import mongoose from "mongoose";
import { sendMail } from "../utils/sendMail.js";


// create contact
export const createContact = async (request, response) => {
    try {
        const {
            fullname,
            mobile,
            email,
            inquiryType,
            profileLink,
            message,
            role
        } = request.body;

        if (!fullname || !mobile || !email || !message) {
            return response.status(400).json({
                message: "Name, mobile, email and message are required",
                success: false,
                error: true
            });
        }

        const contact = new ContactModel({
            fullname,
            mobile,
            email,
            inquiryType,
            profileLink,
            message,
            role
        });

        await contact.save();

        return response.status(201).json({
            message: "Your inquiry has been submitted successfully",
            success: true,
            error: false,
            data: contact
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true

        });
    }
};

// fetch all contact
export const getAllContacts = async (request, response) => {
    try {
        const contacts = await ContactModel.find()
            .sort({ createdAt: -1 })
            .lean();

        return response.status(200).json({
            success: true,
            error: false,
            count: contacts.length,
            data: contacts
        });

    } catch (error) {
        return response.status(500).json({
            success: false,
            error: true,
            message: error.message
        });
    }
};

// send reply by email
export const replyContact = async (request, response) => {
    try {
        const { id } = request.params;
        const { adminReply } = request.body;

        // ✅ Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid contact ID",
                success: false,
                error: true
            });
        }

        // ✅ Check contact exist
        const contactData = await ContactModel.findById(id);
        if (!contactData) {
            return response.status(404).json({
                message: "Contact not found",
                success: false,
                error: true
            });
        }

        // ✅ Update reply
        const contact = await ContactModel.findByIdAndUpdate(
            id,
            {
                adminReply,
                repliedAt: new Date(),
                status: "resolved"
            },
            { new: true }
        );

        // ✅ Send Email
        await sendMail({
            to: contact.email,
            subject: "Response to your inquiry- GREENE VELVET",
            html: `
        <p>Hi ${contact.name},</p>
        <p>${adminReply}</p>
        <br/>
        <p>Thanks & Regards,<br/>Support Team</p>
      `
        });

        return response.status(200).json({
            message: "Reply sent successfully",
            success: true,
            error: false,
            data: contact
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
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
                message: "Invalid contact ID"
            });
        }

        const validStatus = ["pending", "in-progress", "resolved", "closed"];
        if (!validStatus.includes(status)) {
            return response.status(400).json({
                success: false,
                error: true,
                message: "Invalid status value"
            });
        }

        const contact = await ContactModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!contact) {
            return response.status(404).json({
                success: false,
                error: true,
                message: "Contact not found"
            });
        }

        return response.status(200).json({
            success: true,
            error: false,
            message: "Status updated successfully",
            data: contact
        });

    } catch (error) {
        return response.status(500).json({
            success: false,
            error: true,
            message: error.message
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
                message: "Invalid contact ID"
            });
        }

        // ✅ Delete permanently
        const deletedContact = await ContactModel.findByIdAndDelete(id);

        // ✅ Not found
        if (!deletedContact) {
            return response.status(404).json({
                success: false,
                error: true,
                message: "Contact not found"
            });
        }

        return response.status(200).json({
            success: true,
            error: false,
            message: "Contact deleted permanently"
        });

    } catch (error) {
        return response.status(500).json({
            success: false,
            error: true,
            message: error.message
        });
    }
};