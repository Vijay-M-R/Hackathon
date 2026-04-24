import express from "express";
import { 
  registerCompany, sendRequest, getMyRequests, 
  getMyDrives, getDriveApplicants, updateDrive 
} from "../controllers/company.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: Company Signup
router.post("/register", registerCompany);

// Protected: Company Dashboard
router.use(authenticate, authorize("COMPANY"));
router.post("/requests", sendRequest);
router.get("/requests", getMyRequests);
router.get("/drives", getMyDrives);
router.get("/drives/:id/applicants", getDriveApplicants);
router.put("/drives/:id", updateDrive);

export default router;
