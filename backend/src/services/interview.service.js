import { prisma } from "../config/db.js";
import { AIService } from "./ai.service.js";
import { NotificationService } from "./notification.service.js";

export const InterviewService = {
  async createInterview(data) {
    const interview = await prisma.mockInterview.create({
      data: {
        title: data.title,
        type: data.type,
        mode: data.mode,
        studentId: data.studentId,
        facultyId: data.facultyId,
        status: (data.type === "AI" || data.isImmediate) ? "IN_PROGRESS" : "SCHEDULED",
        scheduledAt: data.scheduledAt || new Date()
      }
    });

    if (data.type === "FACULTY") {
      await NotificationService.createNotification(data.studentId, {
        title: "New Mock Interview Scheduled",
        message: `A new ${data.mode} interview has been scheduled: ${data.title}`,
        type: "URGENT"
      });
    }

    return interview;
  },

  async addMessage(interviewId, senderRole, senderName, text) {
    return await prisma.interviewMessage.create({
      data: {
        interviewId,
        senderRole,
        senderName,
        text
      }
    });
  },

  async getInterview(id) {
    return await prisma.mockInterview.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        },
        student: {
          include: { StudentProfile: true }
        }
      }
    });
  },

  async getUserInterviews(userId, role) {
    const where = role === "STUDENT" ? { studentId: userId } : { facultyId: userId };
    return await prisma.mockInterview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { fullName: true, name: true } },
        faculty: { select: { fullName: true, name: true } }
      }
    });
  },

  async endAndAnalyze(interviewId, behavioralData) {
    const interview = await this.getInterview(interviewId);
    if (!interview) throw new Error("Interview not found");

    const transcript = interview.messages.map(m => `${m.senderName}: ${m.text}`).join("\n");
    const analysis = await AIService.analyzeInterviewTranscript(transcript, behavioralData);

    const updatedInterview = await prisma.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: "COMPLETED",
        overallScore: analysis.overallScore,
        analysis: analysis.analysis,
        feedback: analysis.feedback
      }
    });

    // Update Student Profile
    const studentInterviews = await prisma.mockInterview.findMany({
      where: { studentId: interview.studentId, status: "COMPLETED" },
      select: { overallScore: true }
    });

    const avgInterviewScore = studentInterviews.length > 0 
      ? studentInterviews.reduce((a, b) => a + b.overallScore, 0) / studentInterviews.length
      : analysis.overallScore;

    await prisma.studentProfile.update({
      where: { userId: interview.studentId },
      data: {
        interviewScore: avgInterviewScore
      }
    });
    
    // Notify user that analysis is ready
    await NotificationService.createNotification(interview.studentId, {
      title: "Deep Analysis Ready! 🚀",
      message: `Your interview report and prep instructions for "${interview.title}" are ready to view.`,
      type: "SUCCESS"
    });

    // Notify connected clients via Socket
    try {
      const { getIO } = await import("../socket/socket.js");
      const io = getIO();
      if (io) {
        io.to(interview.studentId).emit("notification", {
          title: "Deep Analysis Ready! 🚀",
          body: `Your interview report and prep instructions for "${interview.title}" are ready to view.`
        });
      }
    } catch (e) {
      console.error("Failed to emit socket notification:", e);
    }

    return updatedInterview;
  }
};
