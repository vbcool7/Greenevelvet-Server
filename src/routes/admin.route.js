import { Router } from 'express';
import { adminlogincontroller, adminlogoutcontroller, deleteClient, deleteEscortcontroller, deleteTour, fetchClientdetails, fetchClients, fetchEscortcontroller, fetchEscortdetailscontroller, fetchTourDetails, fetchTours, updateClient, updateEscortcontroller, verifiedEscortcontroller } from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.js';

const adminRouter = Router();

adminRouter.post("/login", adminlogincontroller);
adminRouter.post("/logout", protect(["Admin"]), adminlogoutcontroller);

// Protected example route
adminRouter.get("/admin-data", protect(["Admin"]), async (request, response) => {
    // req.user me Admin ka data aayega
    response.json({ success: true, data: request.user });
});

// escorts curd operation
adminRouter.get("/fetch-unverified-escorts", fetchEscortcontroller)
adminRouter.get("/fetch-escort-details", fetchEscortdetailscontroller)
adminRouter.patch("/escort-update", updateEscortcontroller)
adminRouter.delete("/escort-delete", deleteEscortcontroller)
adminRouter.get("/fetch-verified-escorts", verifiedEscortcontroller)

// clients curd operation
adminRouter.get("/fetch-clients", fetchClients)
adminRouter.get("/fetch-client-details", fetchClientdetails)
adminRouter.patch("/update-client", updateClient)
adminRouter.delete("/delete-client", deleteClient)

// tours curd operation
adminRouter.get("/fetch-tours", fetchTours)
adminRouter.get("/fetch-tour-details", fetchTourDetails)
adminRouter.delete("/delete-tour", deleteTour)


export default adminRouter