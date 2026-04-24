import { TrainingService } from "../services/training.service.js";
import { success, error } from "../utils/response.js";

/**
 * GET /api/training/modules
 * Returns training modules generated from the student's weak topics.
 */
export const getModules = async (req, res) => {
  try {
    const modules = await TrainingService.generateModules(req.user.id);
    return success(res, modules);
  } catch (err) {
    return error(res, "Failed to load training modules", 500, err);
  }
};

/**
 * GET /api/training/modules/:moduleKey
 * Returns a single module with all its Q&A.
 */
export const getModuleByKey = async (req, res) => {
  try {
    const modules = await TrainingService.generateModules(req.user.id);
    const mod = modules.find(m => m.id === req.params.moduleKey);
    if (!mod) return error(res, "Module not found", 404);
    return success(res, mod);
  } catch (err) {
    return error(res, "Failed to load module", 500, err);
  }
};

/**
 * POST /api/training/modules/:moduleKey/read
 * Body: { questionId, totalQuestions }
 * Marks a question as read & updates progress in DB.
 */
export const markRead = async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { questionId, totalQuestions } = req.body;
    if (!questionId) return error(res, "questionId is required", 400);
    const result = await TrainingService.markQuestionRead(req.user.id, moduleKey, questionId, totalQuestions);
    return success(res, result, "Reading progress updated");
  } catch (err) {
    return error(res, "Failed to update reading progress", 500, err);
  }
};

/**
 * GET /api/training/modules/:moduleKey/test
 * Generates a 10-question test from the module's topic.
 */
export const getModuleTest = async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const test = await TrainingService.generateModuleTest(req.user.id, moduleKey);
    return success(res, test);
  } catch (err) {
    return error(res, "Failed to generate test", 500, err);
  }
};

/**
 * POST /api/training/modules/:moduleKey/test/submit
 * Body: { answers: { [questionId]: selectedOptionIndex } }
 * Auto-grades and saves the result.
 */
export const submitModuleTest = async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { answers } = req.body;
    if (!answers || typeof answers !== "object") return error(res, "answers object is required", 400);
    const result = await TrainingService.submitModuleTest(req.user.id, moduleKey, answers);
    return success(res, result, "Test submitted and graded");
  } catch (err) {
    return error(res, "Failed to submit test", 500, err);
  }
};

/**
 * GET /api/training/modules/:moduleKey/test/history
 * Returns past test results for this module.
 */
export const getTestHistory = async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const history = await TrainingService.getTestHistory(req.user.id, moduleKey);
    return success(res, history);
  } catch (err) {
    return error(res, "Failed to load test history", 500, err);
  }
};

/**
 * GET /api/training/weak-topics
 * Returns the student's weak topics with average scores.
 */
export const getWeakTopics = async (req, res) => {
  try {
    const topics = await TrainingService.getWeakTopics(req.user.id);
    return success(res, topics);
  } catch (err) {
    return error(res, "Failed to load weak topics", 500, err);
  }
};
