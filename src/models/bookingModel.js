import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({

    escortId: {
        type: String,
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escort",
        required: true,
        index: true
    },

    clientName: {
        type: String,
        required: true,
    },

    // Booking Date
    date: {
        type: String,   // "YYYY-MM-DD"
        required: true
    },

    // Time Slot
    startTime: {
        type: String,   // "09:00"
        required: true
    },

    endTime: {
        type: String,   // "10:00"
        required: true
    },

    // All Day Booking
    isAllDay: {
        type: Boolean,
        default: false
    },

    // Status
    status: {
        type: String,
        enum: ["Pending", "confirmed", "cancelled", "completed"],
        default: "confirmed"
    },

    // Optional Note / Title
    title: {
        type: String,
        default: ""
    },

    service: {
        type: String,
    },
    
    address: {
        type: String,
    },

    // Payment (optional future use)
    amount: {
        type: Number,
        default: 0
    },

    // Payment Status
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    }

}, {
    timestamps: true
});

export const BookingModel = mongoose.model("Bookings", bookingSchema);