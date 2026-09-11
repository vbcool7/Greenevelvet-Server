import EscortModel from "../models/escortModel.js";
import PrioritySupportModel from "../models/prioritySupportModel.js";
import { decrypt } from "../utils/crypto.js";
import {
    sendMail
} from "../utils/sendMail.js";

// create contact
export const createPrioritySupportTicket = async (request, response) => {
    try {
        const {
            subject,
            message,
            planName,
            prioritySupport,
            prioritySupportPositioning
        } = request.body;

        const userId = request?.user?._id;

        if (!subject || !message) {
            return response.status(400).json({
                message: "Subject and Message are required",
                success: false,
                error: true
            });
        }

        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized access!",
                success: false,
                error: true
            });
        }

        const escort = await EscortModel.findById(userId);

        if (!escort) {
            return response.status(404).json({
                message: "Escort not found!",
                success: false,
                error: true
            });
        }

        const existingTicket = await PrioritySupportModel.findOne({
            escortId: userId,
            status: {
                $in: ["pending", "in-progress"]
            },
            isActive: true
        });

        if (existingTicket) {
            return response.status(409).json({
                message: "You already have an active support ticket.",
                success: false,
                error: true,
                data: existingTicket
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

        // Create Priority Support Ticket
        const ticket = await PrioritySupportModel.create({
            escortId: userId,
            fullname: escort.name,
            mobile: mobile,
            email: escort.email,

            subject,
            message,

            planName: planName ?? "START",
            prioritySupport: prioritySupport ?? false,
            prioritySupportPositioning: prioritySupportPositioning ?? 4
        });


        return response.status(201).json({
            message: "Your ticket has been submitted successfully",
            success: true,
            error: false,
            data: ticket
        });

    } catch (error) {
        console.log("Ticket submission error ", error);

        return response.status(500).json({
            message: "Your ticket submission has been failed!",
            success: false,
            error: true

        });
    }
};


// Get my support tickets
export const getPrioritySupportTickets = async (request, response) => {
    try {
        const userId = request?.user?._id;

        if (!userId) {
            return response.status(401).json({
                message: "Unauthorized access!",
                success: false,
                error: true
            });
        }

        const tickets = await PrioritySupportModel.find({
            escortId: userId
        }).sort({
            createdAt: -1
        });

        return response.status(200).json({
            message: "Priority support tickets fetched successfully",
            success: true,
            error: false,
            data: tickets
        });

    } catch (error) {
        console.log("Fetch priority support tickets error:", error);

        return response.status(500).json({
            message: "Failed to fetch priority support tickets",
            success: false,
            error: true
        });
    }
};


// Get All Tickets by Status
export const getAllPrioritySupportTickets = async (request, response) => {
    try {
        const {
            status
        } = request.query;

        const filter = {};

        if (status && status !== "all") {
            filter.status = status;
        }

        const tickets = await PrioritySupportModel.find(filter)
            .sort({
                createdAt: -1
            });

        return response.status(200).json({
            message: "Priority support tickets fetched successfully",
            success: true,
            error: false,
            data: tickets
        });

    } catch (error) {
        console.log("Fetch all priority support tickets error:", error);

        return response.status(500).json({
            message: "Failed to fetch priority support tickets",
            success: false,
            error: true
        });
    }
};


// Admin reply ticket support
export const replyToPrioritySupportTicket = async (request, response) => {
    try {
        const {
            ticketId,
            text,
            status
        } = request.body;

        // Validate required fields
        if (!ticketId || !text?.trim() || !status) {
            return response.status(400).json({
                message: "Ticket ID, reply message and status are required",
                success: false,
                error: true
            });
        }

        // Validate status
        const allowedStatuses = [
            "pending",
            "in-progress",
            "resolved",
            "closed"
        ];

        if (!allowedStatuses.includes(status)) {
            return response.status(400).json({
                message: "Invalid ticket status",
                success: false,
                error: true
            });
        }

        // Find ticket
        const ticket = await PrioritySupportModel.findById(ticketId);

        if (!ticket) {
            return response.status(404).json({
                message: "Support ticket not found",
                success: false,
                error: true
            });
        }

        if (!ticket.isActive) {
            return response.status(400).json({
                message: "This support ticket is inactive",
                success: false,
                error: true
            });
        }

        // Add admin reply
        ticket.adminReply.push({
            text: text.trim(),
            sender: "Admin",
            time: new Date().toLocaleString()
        });

        // Update ticket status
        ticket.status = status;

        // Update reply time
        ticket.repliedAt = new Date();

        // Save ticket
        await ticket.save();

        // Send email to Escort
        // await sendPrioritySupportReplyEmail({
        //     email: ticket.email,
        //     fullname: ticket.fullname,
        //     subject: ticket.subject,
        //     reply: text.trim(),
        //     status: status
        // });


        await sendMail(
            ticket.email,
            "Response to your ticket - GREENE VELVET",
            `
            <p>Hi ${ticket.fullname},</p>
            <p>${text}</p>
            <br/>
            <p>Thanks & Regards,<br/>Support Team</p>
            `
        );

        return response.status(200).json({
            message: "Reply sent successfully",
            success: true,
            error: false,
            data: ticket
        });

    } catch (error) {
        console.log("Priority support reply error:", error);

        return response.status(500).json({
            message: "Failed to send reply",
            success: false,
            error: true
        });
    }
};


// Update Status
export const updatePrioritySupportTicketStatus = async (request, response) => {
    try {
        const {
            ticketId,
            status
        } = request.body;

        if (!ticketId || !status) {
            return response.status(400).json({
                message: "Ticket ID and status are required",
                success: false,
                error: true
            });
        }

        const allowedStatuses = [
            "pending",
            "in-progress",
            "resolved",
            "closed"
        ];

        if (!allowedStatuses.includes(status)) {
            return response.status(400).json({
                message: "Invalid ticket status",
                success: false,
                error: true
            });
        }

        const ticket = await PrioritySupportModel.findById(ticketId);

        if (!ticket) {
            return response.status(404).json({
                message: "Support ticket not found",
                success: false,
                error: true
            });
        }

        ticket.status = status;

        // Closed ticket becomes inactive
        if (status === "closed") {
            ticket.isActive = false;
        }

        await ticket.save();

        return response.status(200).json({
            message: "Ticket status updated successfully",
            success: true,
            error: false,
            data: ticket
        });

    } catch (error) {
        console.log("Update priority support ticket status error:", error);

        return response.status(500).json({
            message: "Failed to update ticket status",
            success: false,
            error: true
        });
    }
};


// Delete Ticket
export const deletePrioritySupportTicket = async (request, response) => {
    try {
        const {
            ticketId
        } = request.body;

        if (!ticketId) {
            return response.status(400).json({
                message: "Ticket ID is required",
                success: false,
                error: true
            });
        }

        const ticket = await PrioritySupportModel.findById(ticketId);

        if (!ticket) {
            return response.status(404).json({
                message: "Support ticket not found",
                success: false,
                error: true
            });
        }

        await PrioritySupportModel.findByIdAndDelete(ticketId);

        return response.status(200).json({
            message: "Support ticket deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        console.log("Delete priority support ticket error:", error);

        return response.status(500).json({
            message: "Failed to delete support ticket",
            success: false,
            error: true
        });
    }
};