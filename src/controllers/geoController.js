import { reverseGeo } from "../service/geoService.js";

// POST: /api/geo/latlng
export const getGeoFromLatLng = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const data = await reverseGeo(lat, lng);
        return res.json({ success: true, data });
    } catch (err) {
        // fallback default
        return res.json({
            success: true,
            data: { city: "ADELAIDE", country: "AUSTRALIA", lat: -34.9285, lng: 138.6007 },
        });
    }
};