import { InterviewService } from "../services/interview.service.js";
import { AIService } from "../services/ai.service.js";
import { prisma } from "../config/db.js";
import { success, error } from "../utils/response.js";
import { getIO } from "../socket/socket.js";

export const InterviewController = {
  async startInterview(req, res) {
    try {
      const { title, type, mode, facultyId, studentId: bodyStudentId, scheduledAt } = req.body;
      
      const studentId = req.user.role === "FACULTY" ? bodyStudentId : req.user.id;
      const finalFacultyId = req.user.role === "FACULTY" ? req.user.id : (type === "FACULTY" ? facultyId : null);

      if (!studentId) {
        return error(res, "Student ID is required", 400);
      }

      const interview = await InterviewService.createInterview({
        title,
        type,
        mode,
        studentId,
        facultyId: finalFacultyId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        isImmediate: req.body.isImmediate
      });

      if (type === "AI") {
        const student = await prisma.user.findUnique({ where: { id: studentId } });
        const studentName = student?.name || student?.fullName || "Student";

        const firstQuestion = await AIService.generateInterviewQuestion({
          mode,
          transcript: [],
          studentName
        });
        
        await InterviewService.addMessage(interview.id, "AI", "AI Interviewer", firstQuestion);
      }

      const result = await InterviewService.getInterview(interview.id);
      return success(res, result, "Interview started", 201);
    } catch (err) {
      return error(res, "Failed to start interview", 500, err);
    }
  },

  async getInterview(req, res) {
    try {
      const interview = await InterviewService.getInterview(req.params.id);
      if (!interview) return error(res, "Interview not found", 404);
      return success(res, interview);
    } catch (err) {
      return error(res, "Failed to load interview", 500, err);
    }
  },

  async getUserInterviews(req, res) {
    try {
      const interviews = await InterviewService.getUserInterviews(req.user.id, req.user.role);
      return success(res, interviews);
    } catch (err) {
      return error(res, "Failed to load interviews", 500, err);
    }
  },

  async handleAIResponse(req, res) {
    try {
      const { interviewId, text } = req.body;
      const interview = await InterviewService.getInterview(interviewId);
      
      if (!interview || interview.status !== "IN_PROGRESS") {
        return res.status(400).json({ message: "Invalid interview session" });
      }

      // Fetch student name from DB or use email as fallback
      const student = await prisma.user.findUnique({ where: { id: req.user.id } });
      const senderName = student?.name || student?.fullName || student?.email?.split('@')[0] || "Student";

      // Add student message
      await InterviewService.addMessage(interviewId, "STUDENT", senderName, text);

      // Get updated transcript
      const updatedInterview = await InterviewService.getInterview(interviewId);
      const transcript = updatedInterview.messages.map(m => ({ role: m.senderRole, text: m.text }));

      // Generate next question
      const nextQuestion = await AIService.generateInterviewQuestion({
        mode: interview.mode,
        transcript,
        studentName: senderName
      });

      await InterviewService.addMessage(interviewId, "AI", "AI Interviewer", nextQuestion);

      const result = await InterviewService.getInterview(interviewId);
      return success(res, result);
    } catch (err) {
      return error(res, "AI response failed", 500, err);
    }
  },

  async finishInterview(req, res) {
    try {
      const interviewId = req.params.id;
      const { behavioralData } = req.body || {};
      
      // Await analysis for immediate feedback
      const interview = await InterviewService.endAndAnalyze(interviewId, behavioralData);

      return success(res, interview, "Interview submitted and analyzed successfully");
    } catch (err) {
      console.error("Finish Interview Error:", err);
      return error(res, "Failed to analyze interview", 500, err);
    }
  },
  async getFaculties(req, res) {
    try {
      const faculties = await prisma.user.findMany({
        where: { role: "FACULTY" },
        select: {
          id: true,
          name: true,
          fullName: true,
          department: true,
          subjects: true
        }
      });
      return success(res, faculties);
    } catch (err) {
      return error(res, "Failed to load faculties", 500, err);
    }
  }
};
// End of InterviewController
