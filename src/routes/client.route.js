import { request, response, Router } from "express";
import { clientChangeMobile, clientChangePassword, clientVerifyEmail, deleteClientProfile, editClientProfileDetails, fetchClientcontroller, getFavoriteEscorts, logoutClientcontroller, registerClientcontroller, toggleFavoriteEscort, updateClientProfile, uploadAvatarcontroller } from "../controllers/client.controller.js";
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
clientRouter.patch("/upload-avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), uploadAvatarcontroller);


clientRouter.patch("/client-edit-profile-details", editClientProfileDetails);
clientRouter.patch("/client-update-details", updateClientProfile);
clientRouter.patch("/client-change-mobile", clientChangeMobile);
clientRouter.delete("/client-delete-profile", deleteClientProfile);
clientRouter.patch("/client-change-password", protect(["Client"]), clientChangePassword);

clientRouter.post('/toggle-favorite-escort', protect(["Client"]), toggleFavoriteEscort);
clientRouter.get("/get-favorites-escort",protect(["Client"]), getFavoriteEscorts);




export default clientRouter