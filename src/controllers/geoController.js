import { reverseGeo } from "../service/geoService.js";

// POST: /api/geo/latlng
export const getGeoFromLatLng = async (request, response) => {
    try {
        const { lat, lng } = request.body;
        
        console.log("lat long : ", lat, lng);

        const data = await reverseGeo(lat, lng);


        return response.status(200).json({
            message: "success",
            success: true,
            error: false,
            data
        });

    } catch (error) {

        return response.json({
            message: error.message || "Server error",
            success: true,
            error: true,
            data: { city: "UNKNOWN", country: "UNKNOWN", lat: -34.9285, lng: 138.6007 },
        });
    }
};