import express from "express";
import {
  getModules,
  getModuleByKey,
  markRead,
  getModuleTest,
  submitModuleTest,
  getTestHistory,
  getWeakTopics
} from "../controllers/training.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All training routes are STUDENT-only
router.use(authenticate, authorize("STUDENT"));

// GET /api/training/weak-topics
router.get("/weak-topics", getWeakTopics);

// GET /api/training/modules → all modules for the student
router.get("/modules", getModules);

// GET /api/training/modules/:moduleKey → single module details + Q&A
router.get("/modules/:moduleKey", getModuleByKey);

// POST /api/training/modules/:moduleKey/read → mark a question as read
router.post("/modules/:moduleKey/read", markRead);

// GET /api/training/modules/:moduleKey/test → generate test
router.get("/modules/:moduleKey/test", getModuleTest);

// POST /api/training/modules/:moduleKey/test/submit → submit & grade test
router.post("/modules/:moduleKey/test/submit", submitModuleTest);

// GET /api/training/modules/:moduleKey/test/history → past test results
router.get("/modules/:moduleKey/test/history", getTestHistory);

export default router;
