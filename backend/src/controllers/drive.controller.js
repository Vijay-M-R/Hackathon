import { PlacementService } from "../services/placement.service.js";
import { prisma } from "../config/db.js";
import { success, error } from "../utils/response.js";

export const getDrives = async (req, res) => {
  try {
    const userId = req.user?.id;
    const data = await PlacementService.getAllDrives(userId);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch drives", 500, err);
  }
};

export const getTrends = async (req, res) => {
  try {
    const data = await PlacementService.getTrends();
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch trends", 500, err);
  }
};

export const createDrive = async (req, res) => {
  try {
    const { companyId, date, title, role, type, salary, location, description } = req.body;
    const drive = await prisma.placementDrive.create({
      data: { companyId, date: new Date(date), title: title || "Placement Drive", role, type, salary, location, description }
    });
    return success(res, drive, "Drive created successfully", 201);
  } catch (err) {
    return error(res, "Failed to create drive", 500, err);
  }
};

export const getCompanyDrives = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return error(res, "User not associated with a company", 400);
    const data = await PlacementService.getCompanyDrives(companyId);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch company drives", 500, err);
  }
};

export const updateDrive = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) return error(res, "User not associated with a company", 400);
    const data = await PlacementService.updateDrive(req.params.id, companyId, req.body);
    return success(res, data, "Drive updated successfully");
  } catch (err) {
    return error(res, err.message, 400);
  }
};

export const applyToDrive = async (req, res) => {
  try {
    await PlacementService.applyToDrive(req.user.id, req.params.id);
    return success(res, null, "Applied successfully");
  } catch (err) {
    return error(res, err.message, 400);
  }
};

export const getDriveApplicants = async (req, res) => {
  try {
    const data = await PlacementService.getApplicants(req.params.id);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch applicants", 500, err);
  }
};

export const updateApplicantStatus = async (req, res) => {
  const { driveId, studentId } = req.params;
  const { status } = req.body;
  
  try {
    await prisma.studentProfile.update({
      where: { userId: studentId },
      data: { placementStatus: status.toUpperCase() }
    });

    // Send notification to student
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: { company: true }
    });

    const { NotificationService } = await import("../services/notification.service.js");
    await NotificationService.createNotification(studentId, {
      title: "Hiring Status Update",
      message: `Your status for ${drive.company.name} - ${drive.role} has been updated to ${status.toUpperCase()}.`,
      type: "DRIVE"
    });

    return success(res, null, `Status updated to ${status}`);
  } catch (err) {
    return error(res, "Failed to update status", 500, err);
  }
};

export const getInboundRequests = async (req, res) => {
  try {
    const data = await PlacementService.getInboundRequests(req.user.id);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch inbound requests", 500, err);
  }
};

export const getColleges = async (req, res) => {
  try {
    const data = await PlacementService.getColleges();
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to fetch colleges", 500, err);
  }
};

export const handleInboundRequest = async (req, res) => {
  try {
    const data = await PlacementService.handleInboundRequest(req.params.id, req.body);
    return success(res, data, "Request decision updated");
  } catch (err) {
    return error(res, "Failed to update request decision", 500, err);
  }
};
