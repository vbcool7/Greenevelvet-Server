// backend/services/geoService.js
import axios from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 🔹 Primary: Lat/Lng → Google Reverse Geocode
export const reverseGeo = async (lat, lng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    const res = await axios.get(url);
    const results = res.data.results;

    if (!results || results.length === 0) throw new Error("No location found");

    const components = results[0].address_components;

    let city = "";
    let country = "";

    components.forEach((comp) => {
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("country")) country = comp.long_name;
    });

    // Backup if city not found
    if (!city) {
      const alt = components.find((c) =>
        c.types.includes("administrative_area_level_2")
      );
      city = alt?.long_name || "Unknown";
    }

    return { city, country: country || "Unknown", lat, lng };
  } catch (error) {
    console.log("Reverse Geo Error:", error.message);
    // fallback default location
    return { city: "Mumbai", country: "India", lat: 19.076, lng: 72.8777 };
  }
};