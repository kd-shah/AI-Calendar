import authController from "../controllers/auth.controller.js"; 
import express from "express";

const router = express.Router();

router.post("/sign-in", authController.signIn);

export default router;
