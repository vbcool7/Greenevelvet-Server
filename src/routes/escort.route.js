import { Router } from "express";
import { addNewstourCommentController, advanceSearchController, changeMobilenumber, createNewsTourcontroller, deleteNewsTourController, escortdetailscontroller, escortLogincontroller, escortRatescontroller, escortServicescontroller, escortUploadverification, fetchAllNewsTourController, fetchEscortdetailscontroller, fetchEscortNewsTourcontroller, fetchFiltercityescortscontroller, fetchFilterHomescortscontroller, fetchSelectNewsTourController, logoutEscortcontroller, registerEscortcontroller, sendOtpcontroller, toggleNewstourLikeController, updateHighlightscontroller, updateNewsTourController, uploadAvatarcontroller, uploadImagescontroller, uploadVideoscontroller, verifiedEscortcontroller, verifyEmailcontroller, verifyMobileotp } from '../controllers/escort.controller.js'
import upload from "../middleware/multer.js";
import { protect } from "../middleware/auth.js";

const escortRouter = Router()

escortRouter.post("/login", escortLogincontroller)

// Protected example route
escortRouter.get("/escort-data", protect("Escort"), async (request, response) => {
    response.json({ success: true, data: request.user });
});

// registration
escortRouter.post('/register', registerEscortcontroller)
escortRouter.get("/verify-email", verifyEmailcontroller)
escortRouter.post("/change-mobilenumber", changeMobilenumber)
escortRouter.post("/send-otp", sendOtpcontroller)
escortRouter.post("/verify-otp", verifyMobileotp)
escortRouter.post("/adddetails", escortdetailscontroller)
escortRouter.post("/upload-verification", upload.fields([{ name: "verificationselfie", maxCount: 1 }, { name: "verificationgovtId", maxCount: 1 },]), escortUploadverification);

// dashboard
escortRouter.get("/escort-details", fetchEscortdetailscontroller)
escortRouter.post('/logout', logoutEscortcontroller)
escortRouter.patch("/upload-avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), uploadAvatarcontroller)
escortRouter.post("/upload-gallery-images", upload.array("photos", 6), uploadImagescontroller)
escortRouter.post("/upload-gallery-videos", upload.array("videos", 6), uploadVideoscontroller)
escortRouter.patch("/update-highlights", updateHighlightscontroller)
escortRouter.post("/add-services", escortServicescontroller)
escortRouter.post("/add-rates", escortRatescontroller)

escortRouter.get("/fetch-escorts", verifiedEscortcontroller)

// fecthing escorts by filters
escortRouter.get("/filter-home-escorts", fetchFilterHomescortscontroller);
escortRouter.get("/filter-city-escorts", fetchFiltercityescortscontroller);
escortRouter.get("/advance-search-escorts", advanceSearchController)

// NewsTour (full CURD operation)
escortRouter.post("/create-newsandtour", upload.array("media", 3), createNewsTourcontroller);
escortRouter.get("/fetch-escort-newsandtour", fetchEscortNewsTourcontroller);
escortRouter.patch("/update-newstour", upload.array("media", 3), updateNewsTourController);
escortRouter.post("/delete-newstour", deleteNewsTourController);
escortRouter.get("/fetch-all-newstour", fetchAllNewsTourController);

escortRouter.get("/fetch-selected-newstour", fetchSelectNewsTourController);

escortRouter.post("/create-newstour-comment", upload.single("media"), addNewstourCommentController)
escortRouter.post("/create-newstour-like", toggleNewstourLikeController)
export default escortRouter;
