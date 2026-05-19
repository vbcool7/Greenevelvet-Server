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

    // Booking Date
    date: {
        type: String,   // "YYYY-MM-DD"
        default: ""
    },

    // Time Slot
    startTime: {
        type: String,   // "09:00"
        default: ""
    },

    endTime: {
        type: String,   // "10:00"
        default: ""
    },

    // All Day Booking
    isAllDay: {
        type: Boolean,
        default: false
    },
    notAvailable: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ["booking", "availability"],
    },

    // Status
    status: {
        type: String,
        enum: ["active", "completed", "cancel"],
        default: "active"
    },

    // Optional Note / Title
    title: {
        type: String,
        default: ""
    },

    availabilityMode: {
        type: String,
        enum: ["single", "multiple", "weekly"],
        default: "single",
    },

    repeatWeekly: {
        type: Boolean,
        default: false
    },
    weekDays: {
        type: [String],
        enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        default: [],
    },
    repeatUntil: {
        type: String
    },


}, {
    timestamps: true
});

const BookingModel = mongoose.model("Bookings", bookingSchema);

export default BookingModel;