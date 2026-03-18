import { Router } from "express";
import { addBlogComment, addNewstourCommentController, advanceSearchController, blockBlogComments, changeMobilenumber, createBlog, createNewsTourcontroller, deleteBlog, deleteNewsTourController, escortdetailscontroller, escortLogincontroller, escortRatescontroller, escortServicescontroller, escortUploadverification, fetchAllBlogs, fetchAllNewsTourController, fetchEscortBlog, fetchEscortdetailscontroller, fetchEscortNewsTourcontroller, fetchFiltercityescortscontroller, fetchFilterHomescortscontroller, fetchSelectBlog, fetchSelectedBlogComments, fetchSelectedNewsTourComments, fetchSelectNewsTourController, logoutEscortcontroller, registerEscortcontroller, sendOtpcontroller, toggleBlogLike, toggleNewstourLikeController, updateBlog, updateHighlightscontroller, updateNewsTourController, uploadAvatarcontroller, uploadImagescontroller, uploadVideoscontroller, verifiedEscortcontroller, verifyEmailcontroller, verifyMobileotp } from '../controllers/escort.controller.js'
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
escortRouter.post("/create-newstour-comment", upload.single("media"), addNewstourCommentController);
escortRouter.post("/create-newstour-like", toggleNewstourLikeController);
escortRouter.get("/fetch-selected-newstour-comments", fetchSelectedNewsTourComments);


// Blog (full CURD operation)
escortRouter.post("/create-blog", upload.array("media", 3),createBlog);
escortRouter.patch("/update-blog", upload.array("media", 3), updateBlog);
escortRouter.post("/delete-blog", deleteBlog);
escortRouter.post("/block-blog-comments", blockBlogComments);
escortRouter.get("/fetch-all-blogs",fetchAllBlogs);
escortRouter.get("/fetch-escort-blog", fetchEscortBlog);
escortRouter.get("/fetch-selected-blog",fetchSelectBlog);
escortRouter.post("/create-blog-like",toggleBlogLike);
escortRouter.post("/create-blog-comment",upload.single("media"),addBlogComment);
escortRouter.get("/fetch-selected-blog-comments",fetchSelectedBlogComments);


export default escortRouter;
