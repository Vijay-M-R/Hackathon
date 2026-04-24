import { CompanyService } from "../services/company.service.js";
import { PlacementService } from "../services/placement.service.js";
import { success, error } from "../utils/response.js";

export const getCompanies = async (req, res) => {
  try {
    const data = await PlacementService.getCompanies();
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to load companies", 500, err);
  }
};

export const createCompany = async (req, res) => {
  try {
    const data = await PlacementService.createCompany(req.body);
    return success(res, data, "Company added successfully", 201);
  } catch (err) {
    return error(res, "Failed to add company", 500, err);
  }
};

export const registerCompany = async (req, res) => {
  try {
    const data = await CompanyService.register(req.body);
    return success(res, data, "Company registration successful", 201);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

export const sendRequest = async (req, res) => {
  try {
    const data = await CompanyService.sendPlacementRequest(req.user.companyId, req.body);
    return success(res, data, "Placement request sent to PO", 201);
  } catch (err) {
    return error(res, "Failed to send request", 500, err);
  }
};

export const getMyRequests = async (req, res) => {
  try {
    console.log("Recruiter User Payload:", req.user);
    const data = await CompanyService.getMyRequests(req.user.companyId);
    return success(res, data);
  } catch (err) {
    console.error("Error in getMyRequests controller:", err);
    return error(res, "Failed to load requests", 500, err);
  }
};

export const getMyDrives = async (req, res) => {
  try {
    const data = await CompanyService.getMyDrives(req.user.companyId);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to load drives", 500, err);
  }
};

export const getDriveApplicants = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CompanyService.getDriveApplicants(id);
    return success(res, data);
  } catch (err) {
    return error(res, "Failed to load applicants", 500, err);
  }
};

export const updateDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CompanyService.updateDrive(id, req.user.companyId, req.body);
    return success(res, data, "Drive updated successfully");
  } catch (err) {
    return error(res, err.message || "Failed to update drive", 500, err);
  }
};
