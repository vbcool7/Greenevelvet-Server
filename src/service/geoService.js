// backend/services/geoService.js
import axios from "axios";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_API_KEY;

// 🔹 Primary: Lat/Lng → Google Reverse Geocode
export const reverseGeo = async (lat, lng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await axios.get(url);

    // गूगल स्टेटस चेक करें (ये बहुत ज़रूरी है)
    if (res.data.status !== "OK") {
      console.log("Google API Status Error:", res.data.status, res.data.error_message || "");
      throw new Error(`Google API Error: ${res.data.status}`);
    }

    const results = res.data.results;
    if (!results || results.length === 0) throw new Error("No location found");

    const components = results[0].address_components;
    let city = "";
    let country = "";

    components.forEach((comp) => {
      // 'locality' या 'postal_town' अक्सर सिटी के लिए यूज़ होते हैं
      if (comp.types.includes("locality") || comp.types.includes("postal_town")) city = comp.long_name;
      if (comp.types.includes("country")) country = comp.long_name;
    });

    if (!city) {
      const alt = components.find((c) =>
        c.types.includes("administrative_area_level_2") || c.types.includes("political")
      );
      city = alt?.long_name || "UNKNOWN";
    }

    return { city: city.toUpperCase(), country: country.toUpperCase() || "UNKNOWN", lat, lng };

  } catch (error) {
    console.log("Final Catch Error:", error.message);
    // एरर होने पर 'UNKNOWN' भेजें ताकि फ्रंटएंड Restricted Page दिखा सके
    return { city: "UNKNOWN", country: "UNKNOWN", lat, lng };
  }
};