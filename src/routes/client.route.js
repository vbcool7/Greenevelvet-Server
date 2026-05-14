import { request, response, Router } from "express";
import { clientVerifyEmail, fetchClientcontroller, logoutClientcontroller, registerClientcontroller, uploadAvatarcontroller } from "../controllers/client.controller.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const clientRouter = Router()

clientRouter.post("/register", registerClientcontroller);
clientRouter.get("/verify-email", clientVerifyEmail);

// Protected example route
clientRouter.get("/client-data", protect(["Client"]), async (request, response) => {
    response.json({ success: true, data: request.user });
});
clientRouter.post("/logout", logoutClientcontroller);
clientRouter.get("/fetch-client-details", fetchClientcontroller);
clientRouter.patch("/upload-avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), uploadAvatarcontroller)

export default clientRouter