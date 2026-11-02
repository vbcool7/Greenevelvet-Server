import { Router } from "express";
import {
  createBanner,
  deleteBanner,
  getAllBanners,
  updateBanner,
} from "../controllers/banner.controller.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const bannerRouter = Router();

bannerRouter.post(
  "/create-banner",
  protect(["Admin"]),
  upload.single("banner"),
  createBanner,
);

bannerRouter.get("/get-all-banners", getAllBanners);

bannerRouter.patch(
  `/update-banner/:bannerId`,
  protect(["Admin"]),
  upload.single("banner"),
  updateBanner,
);

bannerRouter.delete(
  `/delete-banner/:bannerId`,
  protect(["Admin"]),
  deleteBanner,
);

export default bannerRouter;
