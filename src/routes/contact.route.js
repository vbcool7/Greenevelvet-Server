import { Router } from "express";
import { createContact, deleteContact, getAllContacts, replyContact, updateContactStatus } from "../controllers/contact.controller.js";

const contactRouter = Router();

contactRouter.post("/create-contact", createContact);
contactRouter.get("/all-contact", getAllContacts);
contactRouter.patch("/update-contact-status/:id", updateContactStatus);
contactRouter.patch("/reply-contact/:id", replyContact);
contactRouter.delete("/delete-contact/:id", deleteContact);


export default contactRouter;