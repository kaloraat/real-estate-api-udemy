import express from "express";
import * as ad from "../controllers/ad.js";
import { requireSignin, isAdmin } from "../middlewares/auth.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-image", requireSignin, upload.any(), ad.uploadImage);
router.delete("/remove-image", requireSignin, ad.removeImage);
router.post("/create-ad", requireSignin, ad.createAd);
router.get("/ad/:slug", ad.read);
router.get("/ads-for-sell/:page", ad.adsForSell);
router.get("/ads-for-rent/:page", ad.adsForRent);
router.put("/update-ad/:slug", requireSignin, ad.updateAd);
router.delete("/delete-ad/:slug", requireSignin, ad.deleteAd);

router.get("/user-ads/:page", requireSignin, ad.userAds);
router.put("/update-ad-status/:slug", requireSignin, ad.updateAdStatus);
router.post("/contact-agent", requireSignin, ad.contactAgent);

router.get("/enquired-ads/:page", requireSignin, ad.enquiredAds);

router.put("/toggle-wishlist/:adId", requireSignin, ad.toggleWishlist);
router.get("/wishlist/:page", requireSignin, ad.wishlist);

router.post("/search-ads", ad.searchAds);

// admin route
router.put(
  "/toggle-published/:adId",
  requireSignin,
  isAdmin,
  ad.togglePublished
);

export default router;
