import jwt from "jsonwebtoken";
import AdminModel from "../models/adminModel.js";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";

export const protect = (roles = []) => async (req, res, next) => {
  try {
    // 🔹 1. Header check (SAFE)
    const authHeader = req?.headers?.authorization;

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

    // 🔹 4. Role check (MULTIPLE SUPPORT 🔥)
    if (roles.length > 0 && !roles.includes(decoded.role)) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
        error: true
      });
    }

    const userId = decoded._id;

    let user;

    // 🔹 5. Fetch user based on role
    switch (decoded.role) {
      case "Admin":
        user = await AdminModel.findById(userId).select("-password");
        break;

      case "Escort":
        user = await EscortModel.findById(userId).select("-password");
        break;

      case "Client":
        user = await ClientModel.findById(userId).select("-password");
        break;

      default:
        return res.status(403).json({
          message: "Invalid role",
          success: false,
          error: true
        });
    }

    // 🔹 6. Null check
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        success: false,
        error: true
      });
    }

    // 🔹 7. Attach user
    req.user = user;
    req.role = decoded.role;

    next();

  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    return res.status(401).json({
      message:
        error.name === "TokenExpiredError"
          ? "Token expired"
          : "Not authorized",
      success: false,
      error: true
    });
  }
};