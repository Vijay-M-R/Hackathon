import { prisma } from "../config/db.js";

/**
 * Identify weak topics for a student (subjects where avg score < 60).
 * Returns array of { topic, subject, avgScore }.
 */
async function getWeakTopics(userId) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId },
    include: {
      assessment: { select: { subject: true, topic: true, type: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!attempts.length) return [];

  // Group by subject
  const subjectMap = {};
  for (const a of attempts) {
    const key = a.assessment.subject || "General";
    if (!subjectMap[key]) subjectMap[key] = { subject: key, topic: a.assessment.topic || key, scores: [] };
    subjectMap[key].scores.push(a.score);
  }

  const weakTopics = Object.values(subjectMap)
    .map(s => ({
      topic: s.topic,
      subject: s.subject,
      avgScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
    }))
    .filter(s => s.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5); // top 5 weakest

  return weakTopics;
}

/**
 * Generate training modules based on weak topics.
 * Each module = { id, subject, topic, avgScore, questions: [{id, text, answer, difficulty, options}] }
 * Questions are pulled from the Question table filtered by subject/topic.
 */
async function generateModules(userId) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId },
    include: { assessment: { select: { subject: true, topic: true } } },
    orderBy: { createdAt: "desc" }
  });

  // Calculate actual averages and track most recent subjects
  const subjectMap = {};
  for (const a of attempts) {
    const key = a.assessment.subject || "General";
    if (!subjectMap[key]) {
      subjectMap[key] = { 
        subject: key, 
        topic: a.assessment.topic || key, 
        scores: [],
        lastAttemptAt: a.createdAt
      };
    }
    subjectMap[key].scores.push(a.score);
  }

  const allPracticedTopics = Object.values(subjectMap).map(s => ({
    topic: s.topic,
    subject: s.subject,
    avgScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    lastAttemptAt: s.lastAttemptAt
  }));

  // Sort: Weakest first, then most recent
  const sortedTopics = allPracticedTopics.sort((a, b) => {
    if (a.avgScore < 60 && b.avgScore >= 60) return -1;
    if (a.avgScore >= 60 && b.avgScore < 60) return 1;
    return new Date(b.lastAttemptAt) - new Date(a.lastAttemptAt);
  });

  let finalTopics = sortedTopics.slice(0, 5);

  // If we have fewer than 5 practiced topics, fill with default ones
  if (finalTopics.length < 5) {
    const availableSubjects = await prisma.question.findMany({
      where: { isVisible: true },
      select: { subject: true },
      distinct: ["subject"]
    });
    
    for (const sub of availableSubjects) {
      if (finalTopics.length >= 5) break;
      if (!subjectMap[sub.subject]) {
        finalTopics.push({ topic: sub.subject, subject: sub.subject, avgScore: 100 });
      }
    }
  }

  return buildModules(finalTopics, userId);
}

async function buildModules(topics, userId) {
  // Load read progress
  const readProgress = await prisma.trainingModuleProgress.findMany({
    where: { userId }
  });
  const progressMap = {};
  for (const p of readProgress) {
    progressMap[p.moduleKey] = p;
  }

  const modules = await Promise.all(
    topics.map(async (t, idx) => {
      const moduleKey = `${t.subject}_${t.topic}`.replace(/\s+/g, "_").toLowerCase();

      // Fetch questions for this subject/topic
      const questions = await prisma.question.findMany({
        where: {
          OR: [
            { isVisible: true },
            { uploadedById: userId }
          ],
          AND: [
            {
              OR: [
                { subject: { contains: t.subject, mode: "insensitive" } },
                { topic: { contains: t.topic, mode: "insensitive" } }
              ]
            }
          ]
        },
        include: { tags: { select: { name: true } } },
        orderBy: [{ difficulty: "asc" }, { createdAt: "desc" }],
        take: 20
      });

      const prog = progressMap[moduleKey];
      const readCount = prog?.questionsRead || 0;
      const totalQs = questions.length;
      const progressPct = totalQs > 0 ? Math.round((readCount / totalQs) * 100) : 0;
      
      // Use the most recent activity date
      const lastActivity = [prog?.updatedAt, t.lastAttemptAt].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];

      return {
        id: moduleKey,
        index: idx + 1,
        subject: t.subject,
        topic: t.topic,
        avgScore: t.avgScore,
        questionsTotal: totalQs,
        questionsRead: readCount,
        progress: progressPct,
        completed: prog?.completed || false,
        lastReadAt: lastActivity || null,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          answer: q.answer,
          options: q.options,
          difficulty: q.difficulty || "MEDIUM",
          subject: q.subject,
          topic: q.topic,
          tags: q.tags.map(t => t.name)
        }))
      };
    })
  );

  return modules;
}

/**
 * Mark a question as read in a module, updating reading progress.
 */
async function markQuestionRead(userId, moduleKey, questionId, totalQuestions) {
  // Upsert module progress record
  let prog = await prisma.trainingModuleProgress.findUnique({
    where: { userId_moduleKey: { userId, moduleKey } }
  });

  const readSet = prog ? new Set(prog.readQuestionIds) : new Set();
  readSet.add(questionId);

  const questionsRead = readSet.size;
  const completed = questionsRead >= totalQuestions;

  prog = await prisma.trainingModuleProgress.upsert({
    where: { userId_moduleKey: { userId, moduleKey } },
    create: {
      userId,
      moduleKey,
      questionsRead,
      readQuestionIds: [...readSet],
      completed
    },
    update: {
      questionsRead,
      readQuestionIds: [...readSet],
      completed
    }
  });

  return {
    moduleKey,
    questionsRead,
    completed,
    progress: totalQuestions > 0 ? Math.round((questionsRead / totalQuestions) * 100) : 0
  };
}

/**
 * Generate a timed test from a module's questions.
 * Returns 10 questions (or all if < 10) in randomized order.
 */
async function generateModuleTest(userId, moduleKey) {
  // Derive subject/topic from moduleKey
  const [subjectRaw, ...topicParts] = moduleKey.split("_");
  const subject = subjectRaw.replace(/_/g, " ");
  const topic = topicParts.join(" ");

  try {
    // 1. Call AI Service to generate the test
    const aiResponse = await fetch("http://localhost:8000/generate-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, topic, count: 10 })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI Service failed with status ${aiResponse.status}`);
    }
    
    const aiData = await aiResponse.json();
    const durationMinutes = aiData.durationMinutes || 10;
    const generatedQuestions = aiData.questions || [];

    // 2. Insert the generated questions into the database
    // We mark them as isVisible: false so they don't clutter the faculty's main bank.
    // We also tag them as "AI_GENERATED".
    const savedQuestions = [];
    
    // Ensure AI_GENERATED tag exists
    let aiTag = await prisma.tag.findUnique({ where: { name: "AI_GENERATED" } });
    if (!aiTag) {
      aiTag = await prisma.tag.create({ data: { name: "AI_GENERATED" } });
    }

    for (const q of generatedQuestions) {
      const savedQ = await prisma.question.create({
        data: {
          text: q.question_text || "Missing question text",
          answer: q.answer || "Missing answer",
          options: q.options || [],
          type: q.type || "MCQ",
          subject: subject,
          topic: topic,
          difficulty: q.difficulty || "MEDIUM",
          isVisible: false,
          uploadedBy: { connect: { id: userId } },
          tags: { connect: [{ id: aiTag.id }] }
        }
      });
      savedQuestions.push(savedQ);
    }

    // 3. Return the exact format expected by the frontend
    return {
      moduleKey,
      subject,
      topic,
      totalQuestions: savedQuestions.length,
      durationMinutes: durationMinutes,
      questions: savedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: Array.isArray(q.options) ? q.options : [],
        difficulty: q.difficulty || "MEDIUM",
        subject: q.subject,
        topic: q.topic
        // Note: answer NOT sent to client until submission
      }))
    };
  } catch (err) {
    console.error("Error generating AI module test:", err);
    throw new Error("Failed to generate dynamic test from AI service");
  }
}

/**
 * Submit and auto-grade a module test.
 * answers = { [questionId]: selectedOptionIndex | answerText }
 */
async function submitModuleTest(userId, moduleKey, answers) {
  // Fetch all question answers
  const questionIds = Object.keys(answers);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } }
  });

  let correct = 0;
  const results = questions.map(q => {
    const studentAns = answers[q.id];
    let isCorrect = false;

    if (Array.isArray(q.options) && q.options.length > 0) {
      // MCQ: compare selected option text to answer
      const selectedOption = q.options[Number(studentAns)];
      isCorrect = selectedOption === q.answer || String(studentAns) === String(q.answer);
    } else {
      // Text: simple string match
      isCorrect = String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    }

    if (isCorrect) correct++;
    return {
      questionId: q.id,
      questionText: q.text,
      correctAnswer: q.answer,
      studentAnswer: Array.isArray(q.options) ? q.options[Number(studentAns)] : String(studentAns),
      isCorrect,
      options: q.options
    };
  });

  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  // Save test result
  await prisma.trainingTestResult.create({
    data: {
      userId,
      moduleKey,
      score,
      correctCount: correct,
      totalCount: questions.length,
      answers
    }
  });

  // If score >= 70, mark module as completed
  if (score >= 70) {
    await prisma.trainingModuleProgress.upsert({
      where: { userId_moduleKey: { userId, moduleKey } },
      create: { userId, moduleKey, questionsRead: questions.length, readQuestionIds: questionIds, completed: true },
      update: { completed: true }
    });
  }

  return { moduleKey, score, correct, total: questions.length, results };
}

/**
 * Get test history for a student per module.
 */
async function getTestHistory(userId, moduleKey) {
  const results = await prisma.trainingTestResult.findMany({
    where: { userId, ...(moduleKey ? { moduleKey } : {}) },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  return results;
}

export const TrainingService = {
  getWeakTopics,
  generateModules,
  markQuestionRead,
  generateModuleTest,
  submitModuleTest,
  getTestHistory
};
