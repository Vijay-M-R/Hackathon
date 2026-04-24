import express from "express";
import {
  extractQuestions,
  saveQuestions,
  getQuestions,
  generateQuestions,
  submitPracticeTest,
} from "../controllers/question.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/extract",
  authenticate,
  authorize("FACULTY", "PLACEMENT", "STUDENT"),
  upload.single("file"),
  extractQuestions,
);

router.post(
  "/save",
  authenticate,
  authorize("FACULTY", "PLACEMENT", "STUDENT"),
  saveQuestions,
);

router.post(
  "/generate",
  authenticate,
  authorize("FACULTY", "PLACEMENT", "STUDENT"),
  generateQuestions,
);

router.post(
  "/submit-practice",
  authenticate,
  authorize("STUDENT"),
  submitPracticeTest,
);

router.get("/", authenticate, getQuestions);

export default router;
