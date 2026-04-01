export const protect = (role) => async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const userId = decoded.id || decoded._id;

            // ✅ role check BEFORE DB call
            if (role && decoded.role !== role) {
                return res.status(403).json({ message: "Access denied" });
            }

            // fetch user
            if (decoded.role === "Admin") {
                req.user = await AdminModel.findById(userId).select("-password");
            } else if (decoded.role === "Escort") {
                req.user = await EscortModel.findById(userId).select("-password");
            } else if (decoded.role === "Client") {
                req.user = await ClientModel.findById(userId).select("-password");
            } else {
                return res.status(403).json({ message: "Invalid role" });
            }

            // ✅ null check
            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }

            next();
        } else {
            return res.status(401).json({ message: "No token provided" });
        }
    } catch (error) {
        return res.status(401).json({
            message: "Not authorized",
            error: error.message
        });
    }
};