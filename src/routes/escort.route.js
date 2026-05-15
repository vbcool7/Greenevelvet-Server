import { Router } from "express";
import { addBlogComment, addBooking, addNewstourCommentController, addTour, advanceSearchController, blockBlogComments, cancelBooking, cancelTour, changeMobilenumber, complteBooking, createBlog, createNewsTourcontroller, deleteBlog, deleteBooking, deleteEscortProfile, deleteNewsTourController, deleteTour, editEscortProfileDetails, escortChangePassword, escortdetailscontroller, escortForgotPassword, escortLogincontroller, escortRatescontroller, escortResetPassword, escortServicescontroller, escortUploadverification, escortVerifyOtp, fetchAllBlogs, fetchAllNewsTourController, fetchBookings, fetchCitySliderEscorts, fetchEscortBlog, fetchEscortdetailscontroller, fetchEscortNewsTourcontroller, fetchFiltercityescortscontroller, fetchFilterHomescortscontroller, fetchHomeSliderEscorts, fetchSelectBlog, fetchSelectBooking, fetchSelectedBlogComments, fetchSelectedNewsTourComments, fetchSelectNewsTourController, getEscortContact, getToursByDate, hideEscortProfile, logoutEscortcontroller, registerEscortcontroller, sendOtpcontroller, toggleBlogLike, toggleFaceBlur, toggleNewstourLikeController, updateBlog, updateBooking, updateEscortProfile, updateHighlightscontroller, updateNewsTourController, updateTour, uploadAvatarcontroller, uploadImagescontroller, uploadVideoscontroller, verifiedEscortcontroller, verifyEmailcontroller, verifyMobileotp } from '../controllers/escort.controller.js'
import upload from "../middleware/multer.js";
import { protect } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const escortRouter = Router()

escortRouter.post("/login", escortLogincontroller)

// Protected example route
escortRouter.get("/escort-data", protect(["Escort"]), async (request, response) => {
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

escortRouter.post('/change-password', protect(["Escort"]), escortChangePassword);
escortRouter.post('/send-otp', escortForgotPassword)
escortRouter.post('/verify-otp', escortVerifyOtp)
escortRouter.post('/reset-password', escortResetPassword)

// dashboard
escortRouter.get("/escort-details", fetchEscortdetailscontroller)
escortRouter.post('/logout', logoutEscortcontroller)
escortRouter.patch("/upload-avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), uploadAvatarcontroller)
escortRouter.patch("/blur-avatar-face", protect(["Escort"]), toggleFaceBlur)
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
escortRouter.post("/create-newstour-comment", upload.single("media"), addNewstourCommentController);
escortRouter.post("/create-newstour-like", toggleNewstourLikeController);
escortRouter.get("/fetch-selected-newstour-comments", fetchSelectedNewsTourComments);


// Blog (full CURD operation)
escortRouter.post("/create-blog", upload.array("media", 3), createBlog);
escortRouter.patch("/update-blog", upload.array("media", 3), updateBlog);
escortRouter.post("/delete-blog", deleteBlog);
escortRouter.patch("/block-blog-comments", blockBlogComments);
escortRouter.get("/fetch-all-blogs", fetchAllBlogs);
escortRouter.get("/fetch-escort-blog", fetchEscortBlog);
escortRouter.get("/fetch-selected-blog", fetchSelectBlog);
escortRouter.post("/create-blog-like", toggleBlogLike);
escortRouter.post("/create-blog-comment", upload.single("media"), addBlogComment);
escortRouter.get("/fetch-selected-blog-comments", fetchSelectedBlogComments);

// Bookings 
escortRouter.post("/add-booking", addBooking)
escortRouter.get("/fetch-escort-bookings", fetchBookings)
escortRouter.patch("/update-booking", updateBooking)
escortRouter.post("/delete-booking", deleteBooking)
escortRouter.get("/fetch-select-booking", fetchSelectBooking)
escortRouter.post("/cancel-booking", cancelBooking)
escortRouter.post("/complete-booking", complteBooking)

// Tours
escortRouter.post("/add-tour", addTour);
escortRouter.get("/fetch-tours", getToursByDate);
escortRouter.patch("/update-tour", updateTour);
escortRouter.post("/delete-tour", deleteTour);
escortRouter.patch("/cancel-tour", cancelTour);

//  Home Slider Escorts
escortRouter.get("/fetch-home-slider-escorts", fetchHomeSliderEscorts);
escortRouter.get("/fetch-city-slider-escorts", fetchCitySliderEscorts);


// get Escort contact link by Decryp mobile
escortRouter.post("/contact-link", rateLimit(5, 6000), getEscortContact);

escortRouter.patch("/update-profile", updateEscortProfile);
escortRouter.patch("/hide-profile", hideEscortProfile);
escortRouter.post("/delete-profile", deleteEscortProfile);
escortRouter.patch("/edit-escort-profile-details", editEscortProfileDetails);


export default escortRouter;
