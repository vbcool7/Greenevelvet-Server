import jwt from "jsonwebtoken";
import AdminModel from "../models/adminModel.js";

export const protect = async (req, res, next) => {
  try {
    // 🔹 1. Header check
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
        success: false,
        error: true
      });
    }

    // 🔹 2. Token extract
    const token = authHeader.split(" ")[1];

    // 🔹 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔹 4. Strict Admin check
    if (!decoded || decoded.role !== "Admin") {
      return res.status(403).json({
        message: "Only Admin allowed",
        success: false,
        error: true
      });
    }

    // 🔹 5. Fetch Admin from DB
    const admin = await AdminModel.findById(decoded._id).select("-password");

    if (!admin) {
      return res.status(401).json({
        message: "Admin not found",
        success: false,
        error: true
      });
    }

    // 🔹 6. Attach admin to request
    req.user = admin;

    next();

  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Not authorized",
      success: false,
      error: true
    });
  }
};