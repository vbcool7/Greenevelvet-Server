import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createPrioritySupportTicket, deletePrioritySupportTicket, getAllPrioritySupportTickets, getPrioritySupportTickets, replyToPrioritySupportTicket, updatePrioritySupportTicketStatus } from "../controllers/prioritySupport.controller";


const prioritySupportRouter = Router();


prioritySupportRouter.post("/create-support-ticket", protect(["Escort"]), createPrioritySupportTicket);
prioritySupportRouter.get("/my-support-ticket", protect(["Escort"]), getPrioritySupportTickets);
prioritySupportRouter.get("/get-all-tickets", protect(["Admin"]), getAllPrioritySupportTickets);
prioritySupportRouter.patch("/admin-reply-ticket", protect(["Admin"]), replyToPrioritySupportTicket);
prioritySupportRouter.patch("/update-ticket-status", protect(["Admin"]), updatePrioritySupportTicketStatus);
prioritySupportRouter.delete("/delete-ticket", protect(["Admin"]), deletePrioritySupportTicket);


export default prioritySupportRouter;