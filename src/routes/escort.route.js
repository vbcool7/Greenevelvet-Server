import { Router } from "express";
import { advanceSearchController, changeMobilenumber, createNewsTourcontroller, escortdetailscontroller, escortLogincontroller, escortRatescontroller, escortServicescontroller, escortUploadverification, fetchEscortdetailscontroller, fetchEscortNewsTourcontroller, fetchFiltercityescortscontroller, fetchFilterHomescortscontroller, logoutEscortcontroller, registerEscortcontroller, sendOtpcontroller, updateHighlightscontroller, updateNewsTourController, uploadAvatarcontroller, uploadImagescontroller, uploadVideoscontroller, verifiedEscortcontroller, verifyEmailcontroller, verifyMobileotp } from '../controllers/escort.controller.js'
import upload from "../middleware/multer.js";
import { protect } from "../middleware/auth.js";

const escortRouter = Router()

escortRouter.post("/login", escortLogincontroller)

// Protected example route
escortRouter.get("/escort-data", protect("Escort"), async (request, response) => {
    response.json({ success: true, data: request.user });
});

escortRouter.post('/register', registerEscortcontroller)
escortRouter.get("/verify-email", verifyEmailcontroller)
escortRouter.post("/change-mobilenumber", changeMobilenumber)
escortRouter.post("/send-otp", sendOtpcontroller)
escortRouter.post("/verify-otp", verifyMobileotp)
escortRouter.post("/adddetails", escortdetailscontroller)
escortRouter.post("/upload-verification", upload.fields([{ name: "verificationselfie", maxCount: 1 }, { name: "verificationgovtId", maxCount: 1 },]), escortUploadverification);
escortRouter.get("/escort-details", fetchEscortdetailscontroller)
escortRouter.post('/logout', logoutEscortcontroller)
escortRouter.patch("/upload-avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), uploadAvatarcontroller)
escortRouter.post("/upload-gallery-images", upload.array("photos", 6), uploadImagescontroller)
escortRouter.post("/upload-gallery-videos", upload.array("videos", 6), uploadVideoscontroller)
escortRouter.get("/fetch-escorts", verifiedEscortcontroller)
escortRouter.patch("/update-highlights", updateHighlightscontroller)
escortRouter.post("/add-services", escortServicescontroller)
escortRouter.post("/add-rates", escortRatescontroller)

escortRouter.get("/filter-home-escorts", fetchFilterHomescortscontroller);
escortRouter.get("/filter-city-escorts", fetchFiltercityescortscontroller);
escortRouter.get("/advance-search-escorts", advanceSearchController)

escortRouter.post("/create-newsandtour", upload.array("media", 3), createNewsTourcontroller)
escortRouter.get("/fetch-escort-newsandtour", fetchEscortNewsTourcontroller);
escortRouter.patch("/update-newstour", upload.array("media", 3), updateNewsTourController);


export default escortRouter;
