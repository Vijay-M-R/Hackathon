import { prisma } from "../config/db.js";
import { parseExcel, extractFromAI, generateAITest } from "./extraction.service.js";
import fs from "fs";
import path from "path";

export const QuestionService = {
  async extract(file) {
    if (!file) throw new Error("No file provided");
    const ext = path.extname(file.originalname).toLowerCase();
    
    let questions = [];
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv" || ext === ".pdf") {
      questions = await extractFromAI(file.path);
    } else {
      throw new Error("Unsupported file format. Please upload Excel or PDF.");
    }
    
    fs.unlink(file.path, () => {});
    return questions;
  },

  async generate(subject, topic, count) {
    return await generateAITest(subject, topic, count);
  },

  async bulkSave(questions, userId) {
    if (!questions || !Array.isArray(questions)) throw new Error("Invalid questions data");

    return await prisma.$transaction(async (tx) => {
      const savedQuestions = [];
      for (const q of questions) {
        let tagConnect = [];
        if (q.tags && Array.isArray(q.tags)) {
          for (const tagName of q.tags) {
            const tag = await tx.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });
            tagConnect.push({ id: tag.id });
          }
        }

        const savedQ = await tx.question.create({
          data: {
            text: q.text,
            answer: String(q.answer || ""),
            options: q.options || null,
            type: q.type || "MCQ",
            subject: q.subject,
            topic: q.topic,
            difficulty: q.difficulty,
            isVisible: true,
            uploadedBy: { connect: { id: userId } },
            tags: { connect: tagConnect }
          }
        });
        savedQuestions.push(savedQ);
      }
      return savedQuestions;
    });
  },

  async list(filters, user) {
    const { subject, topic, difficulty, tag } = filters;
    const where = {};
    if (subject) where.subject = subject;
    if (topic) where.topic = topic;
    if (difficulty) where.difficulty = difficulty;
    if (tag) where.tags = { some: { name: tag } };

    if (user.role !== "FACULTY" && user.role !== "PLACEMENT") {
      where.OR = [
        { isVisible: true },
        { uploadedById: user.id }
      ];
    }

    return await prisma.question.findMany({
      where,
      include: {
        tags: true,
        uploadedBy: { select: { name: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async savePracticeAttempt(userId, data) {
    const { score, correctCount, totalCount, answers, subject = "General Aptitude", topic = "Practice" } = data;

    // 1. Find or Create a Practice Assessment
    let assessment = await prisma.assessment.findFirst({
      where: { 
        title: `${subject} AI Practice`,
        type: "PRACTICE"
      }
    });

    if (!assessment) {
      // Find a faculty user to be the owner (or use a system ID)
      const faculty = await prisma.user.findFirst({ where: { role: "FACULTY" } });
      
      assessment = await prisma.assessment.create({
        data: {
          title: `${subject} AI Practice`,
          type: "PRACTICE",
          subject,
          topic,
          scheduledAt: new Date(),
          duration: 30,
          resultsReleased: true,
          createdById: faculty ? faculty.id : userId, // Fallback to current user if no faculty
        }
      });
    }

    // 2. Create the Attempt
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        assessmentId: assessment.id,
        score,
        correctCount,
        totalCount,
        timeTaken: data.timeTaken || 0,
        answers: answers || {},
        questionsSnapshot: data.questions || null,
      },
      include: { assessment: true }
    });

    // 3. Update Student Profile Aptitude Score (Weighted Average)
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (profile) {
      let newAptScore = score;
      if (profile.aptitudeScore !== null) {
        // Simple running average for now
        newAptScore = (profile.aptitudeScore + score) / 2;
      }
      
      await prisma.studentProfile.update({
        where: { userId },
        data: { aptitudeScore: newAptScore }
      });
    }

    return attempt;
  }
};
