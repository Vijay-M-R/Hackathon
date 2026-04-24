import express from "express";
import { InterviewController } from "../controllers/interview.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", authenticate, InterviewController.startInterview);
router.get("/user", authenticate, InterviewController.getUserInterviews);
router.get("/:id", authenticate, InterviewController.getInterview);
router.post("/ai-respond", authenticate, InterviewController.handleAIResponse);
router.post("/:id/finish", authenticate, InterviewController.finishInterview);
router.get("/faculties", authenticate, InterviewController.getFaculties);

export default router;
