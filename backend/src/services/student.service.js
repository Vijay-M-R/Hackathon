import { prisma } from "../config/db.js";
import { AIService } from "./ai.service.js";

export const StudentService = {
  async getDashboardStats(userId) {
    let profile = await prisma.studentProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: {
          id: userId,
          userId: userId,
          cgpa: 7.0,
          readinessScore: 50.0,
          placementStatus: "UNPLACED"
        }
      });
    }

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId },
      include: { assessment: true },
      orderBy: { createdAt: "asc" }
    });

    const totalTests = attempts.length;
    const avgScore = totalTests > 0 
      ? attempts.reduce((a, b) => a + b.score, 0) / totalTests 
      : 0;

    // Fetch user for department info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true }
    });

    const dept = (user?.department || profile?.branch || "CSE").toUpperCase();
    const isCSE = dept === "CSE" || dept === "COMPUTER SCIENCE";
    const isEC = dept === "EC" || dept === "ECE" || dept === "ELECTRONICS";

    // Helper to map Assessment to Dashboard Categories
    const getCategory = (assessment) => {
      const type = (assessment.type || "").toLowerCase();
      const subject = (assessment.subject || "").toLowerCase();
      
      // Aptitude
      if (subject.includes("aptitude") || subject.includes("logic") || subject.includes("quant") || subject.includes("math")) 
        return "aptitude";
      
      // Soft Skills
      if (subject.includes("soft") || subject.includes("comm") || subject.includes("english") || subject.includes("hr")) 
        return "soft";

      // Domain/Coding slot
      if (isCSE) {
        if (type === "coding" || subject.includes("prog") || subject.includes("coding") || subject.includes("java") || subject.includes("python") || subject.includes("dsa")) 
          return "coding";
      } else {
        // For non-CSE, treat domain-specific technical subjects in the 'coding' slot
        if (subject.includes("embedded") || subject.includes("vlsi") || subject.includes("signal") || subject.includes("circuit") || subject.includes("analog") || subject.includes("digital") || subject.includes("micro") || subject.includes("control"))
          return "coding";
      }
      
      return "core"; // Default to Core (Core CS for CSE, Core Domain for others)
    };

    // Define Dynamic Labels
    const labels = {
      aptitude: "Aptitude",
      coding: isCSE ? "Coding" : "Domain Skills",
      core: isCSE ? "Core CS" : "Core " + dept,
      soft: "Soft Skills"
    };

    // 1. Calculate Skills Progression (Over Time)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const skillsOverTime = attempts.reduce((acc, a) => {
      const date = new Date(a.createdAt);
      const m = months[date.getMonth()];
      const cat = getCategory(a.assessment);
      
      let entry = acc.find(e => e.month === m);
      if (!entry) {
        entry = { month: m, aptitude: 0, coding: 0, core: 0, soft: 0, _counts: {} };
        acc.push(entry);
      }
      
      // Update running average for that month and category
      entry._counts[cat] = (entry._counts[cat] || 0) + 1;
      entry[cat] = Math.round(((entry[cat] * (entry._counts[cat] - 1)) + a.score) / entry._counts[cat]);
      
      return acc;
    }, []).slice(-6); // Last 6 months

    // 2. Calculate Skill Radar (Current proficiency per category)
    const categories = ["aptitude", "coding", "core", "soft"];
    const skillRadar = categories.map(cat => {
      const catAttempts = attempts.filter(a => getCategory(a.assessment) === cat);
      const value = catAttempts.length > 0 
        ? catAttempts.reduce((s, a) => s + a.score, 0) / catAttempts.length 
        : 0;
      return { 
        skill: labels[cat], 
        value: Math.round(value),
        fullMark: 100 
      };
    });

    // 3. Identify Weak Areas (Subjects with avg score < 60)
    const subjectsList = [...new Set(attempts.map(a => a.assessment.subject || "General"))];
    const weakAreas = subjectsList.map(sub => {
      const subAttempts = attempts.filter(a => (a.assessment.subject || "General") === sub);
      const avg = subAttempts.reduce((s, a) => s + a.score, 0) / subAttempts.length;
      const cat = getCategory(subAttempts[0].assessment);
      return {
        topic: sub,
        category: labels[cat].toUpperCase(),
        score: Math.round(avg)
      };
    }).filter(s => s.score < 60).slice(0, 3);

    return {
      profile,
      department: dept,
      labels,
      stats: {
        readiness: profile?.readinessScore ?? 0,
        testsTaken: totalTests,
        avgScore: Math.round(avgScore),
        placementStatus: profile?.placementStatus ?? "UNPLACED",
        cgpa: profile?.cgpa ?? 0,
        backlogs: profile?.backlogs ?? 0
      },
      skillsOverTime,
      skillRadar,
      weakAreas,
      recentActivity: [...attempts].reverse().slice(0, 5)
    };
  },

  async recalculateReadiness(userId) {
    let profile = await prisma.studentProfile.findUnique({ where: { userId } });
    
    if (!profile) {
      // Create a default profile if missing
      profile = await prisma.studentProfile.create({
        data: {
          id: userId, // Use userId as the ID since it's a 1:1 relation and no default is set in schema
          userId: userId,
          cgpa: 7.0,
          readinessScore: 50.0,
          placementStatus: "UNPLACED"
        }
      });
    }

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10, // Analyze more history for recalibration
      include: { assessment: { select: { subject: true } } }
    });

    const prediction = await AIService.predictReadiness({
      scores: attempts.map(a => a.score),
      weakAreas: [...new Set(attempts.filter(a => a.score < 60).map(a => a.assessment.subject))],
      cgpa: profile.cgpa || 7.0,
      focusLossCount: attempts.reduce((s, a) => s + (a.focusLossCount || 0), 0),
      branch: profile.branch || "General",
      currentScore: profile.readinessScore
    });

    return await prisma.studentProfile.update({
      where: { userId },
      data: {
        readinessScore: prediction.score,
        aiFeedback: prediction.feedback
      }
    });
  }
};
