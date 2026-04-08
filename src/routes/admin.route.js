import { Router } from 'express';
import { adminlogincontroller, adminlogoutcontroller, deleteEscortcontroller, fetchEscortcontroller, fetchEscortdetailscontroller, updateEscortcontroller, verifiedEscortcontroller } from '../controllers/admin.controller.js';
import { Protect } from '../middleware/auth.js';


const adminRouter = Router();

adminRouter.post("/login", adminlogincontroller);
adminRouter.post("/logout", Protect, adminlogoutcontroller);

// Protected example route
adminRouter.get("/admin-data", Protect, async (request, response) => {
    // req.user me Admin ka data aayega
    response.json({ success: true, data: request.user });
});


adminRouter.get("/fetch-unverified-escorts", fetchEscortcontroller)
adminRouter.get("/fetch-escort-details", fetchEscortdetailscontroller)
adminRouter.patch("/escort-update", updateEscortcontroller)
adminRouter.delete("/escort-delete", deleteEscortcontroller)
adminRouter.get("/fetch-verified-escorts", verifiedEscortcontroller)

export default adminRouter