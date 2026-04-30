import { Router } from 'express';
import { adminlogincontroller, adminlogoutcontroller, changePassword, deleteBlog, deleteClient, deleteEscortcontroller, deleteNewsandtour, deleteTour, fetchBlogDetails, fetchBlogs, fetchClientdetails, fetchClients, fetchEscortcontroller, fetchEscortdetailscontroller, fetchNewsandtourDetails, fetchNewsandtours, fetchTourDetails, fetchTours, forgotPassword, getAdminDetails, resetPassword, updateAdminName, updateBlogStatus, updateClient, updateEscortcontroller, updateNewsandtourStatus, verifiedEscortcontroller, verifyOtp } from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.js';

const adminRouter = Router();

adminRouter.post("/login", adminlogincontroller);
adminRouter.post("/logout", protect(["Admin"]), adminlogoutcontroller);

// Protected example route
adminRouter.get("/admin-data", protect(["Admin"]), async (request, response) => {
    // req.user me Admin ka data aayega
    response.json({ success: true, data: request.user });
});

// admin account details fetch and update
adminRouter.get("/get-account-details", protect(["Admin"]), getAdminDetails);
adminRouter.patch("/update-name", protect(["Admin"]), updateAdminName);
adminRouter.post("/change-password", protect(["Admin"]), changePassword);


adminRouter.post("/send-otp", forgotPassword);
adminRouter.post("/verify-otp", verifyOtp);
adminRouter.post("/reset-password", resetPassword);
// -----------------------------------------------------------------------------------------------------------------------------------

// escorts fetch update and delete operation
adminRouter.get("/fetch-unverified-escorts", fetchEscortcontroller)
adminRouter.get("/fetch-escort-details", fetchEscortdetailscontroller)
adminRouter.patch("/escort-update", updateEscortcontroller)
adminRouter.delete("/escort-delete", deleteEscortcontroller)
adminRouter.get("/fetch-verified-escorts", verifiedEscortcontroller)

// clients fetch update and delete operation
adminRouter.get("/fetch-clients", fetchClients)
adminRouter.get("/fetch-client-details", fetchClientdetails)
adminRouter.patch("/update-client", updateClient)
adminRouter.delete("/delete-client", deleteClient)

// tours fetch and delete operation
adminRouter.get("/fetch-tours", fetchTours)
adminRouter.get("/fetch-tour-details", fetchTourDetails)
adminRouter.delete("/delete-tour", deleteTour)

// blogs fetch and delete operation
adminRouter.get("/fetch-blogs", fetchBlogs)
adminRouter.get("/fetch-blog-details", fetchBlogDetails)
adminRouter.patch("/update-blog-status", updateBlogStatus)
adminRouter.delete("/delete-blog", deleteBlog)

// newsandtours fetch and delete
adminRouter.get("/fetch-newsandtours", fetchNewsandtours)
adminRouter.get("/fetch-newsandtour-details", fetchNewsandtourDetails)
adminRouter.patch("/update-newsandtour-status", updateNewsandtourStatus)
adminRouter.delete("/delete-newsandtour", deleteNewsandtour)


export default adminRouter