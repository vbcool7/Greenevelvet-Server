import BookingModel from "../models/bookingModel.js";
import ClientModel from "../models/clientModel.js";
import EscortModel from "../models/escortModel.js";


// get all escorts data
export async function getEscortsdata(request, response) {

    try {
        console.log("api call");

        const escorts = await EscortModel.find()
            .select("-password");

        return response.status(200).json({
            success: true,
            error: false,
            message: `fetch Escort data successfully`,
            data: escorts || [],
        });

    } catch (error) {
        console.log("get escorts data error ", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || error
        });

    }

}

// get all escorts data
export async function getClientsdata(request, response) {

    try {
        console.log("api call");

        const clients = await ClientModel.find()
            .select("-password")

        return response.status(200).json({
            success: true,
            error: false,
            message: `fetch Client data successfully`,
            data: clients || [],
        });

    } catch (error) {
        console.log("get clients data error ", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || error
        });

    }

}

// bookings and availability
export const getBookingsData = async (request, response) => {

    try {

        const bookings = await BookingModel.find()
            .populate({
                path: "userId",
                match: {
                    isVerified: true
                },
                select: `
                name
                country
                city
                isVerified
                avatar
            `
            });

        // REMOVE NULL ESCORTS
        const filteredBookings = bookings.filter(
            (item) => item.userId !== null
        );

        return response.status(200).json({
            message: "Bookings fetched successfully",
            success: true,
            error: false,
            data: filteredBookings
        });

    } catch (error) {

        return response.status(500).json({
            message: error.message || "Server error",
            success: false,
            error: true
        });

    }
};


