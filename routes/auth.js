import express from "express";
import * as auth from "../controllers/auth.js";
import { requireSignin } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", auth.api);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.get("/current-user", requireSignin, auth.currentUser);
router.put("/update-password", requireSignin, auth.updatePassword);
router.put("/update-username", requireSignin, auth.updateUsername);

router.put("/update-profile", requireSignin, auth.updateProfile);

export default router;
